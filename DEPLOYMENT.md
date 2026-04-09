# Deploying FBR Smart Application

The app is a **Vite + React** front end and an **ASP.NET Core 9** API (`backend/FbrSmartApp.Api`) using **SQL Server**. You can host the UI and API on **one site** (recommended) or on two origins.

## 1. Prerequisites

- **Node.js 20+** and npm (build machine)
- **.NET 9 SDK** (build machine and optionally server)
- **SQL Server** reachable from the API
- **HTTPS** in production (refresh cookies use `Secure` when the request is HTTPS)

## 2. Configuration before build

### Front end (`VITE_API_BASE_URL`)

Values are **fixed at `npm run build` time**. If the live site still calls `localhost:5227`, rebuild after setting env and redeploy the new `dist` / publish folder.

The repo includes **`.env.production`** with `VITE_API_BASE_URL=` so IIS single-site builds use **`/api` on the current host**. The app also defaults to same-origin when this variable is unset in production builds.

- **Split deploy** (API on another host): set in `.env.production` before build:

  ```env
  VITE_API_BASE_URL=https://api.yourcompany.com
  ```

See `.env.production.example`.

**Service worker:** Older builds registered MSW’s `mockServiceWorker.js`. After deploying this version, open DevTools → Application → Service Workers → **Unregister**, then hard-refresh (or clear site data) so the browser stops intercepting `fetch`.

### API (`appsettings.Production.json` or environment variables)

Edit `backend/FbrSmartApp.Api/appsettings.Production.json` on the server (or override with env vars):

| Setting | Notes |
|--------|--------|
| `ConnectionStrings:Default` | SQL Server connection string |
| `Auth:JwtSigningKey` | Long random secret (≥ 32 characters) |
| `Auth:AdminUser:Password` | Change from default on first deploy |
| `Cors:AllowedOrigins` | Public URL(s) of the SPA (e.g. `https://app.yourcompany.com`). Required when the browser origin differs from the API (e.g. local Vite dev → remote API). For pure same-origin hosting, you can still list your public HTTPS URL. |

Environment variable overrides use `__` for nesting, e.g.:

`ConnectionStrings__Default`, `Auth__JwtSigningKey`, `Cors__AllowedOrigins__0` (indexed for arrays is awkward; prefer `appsettings.Production.json` or Azure App Configuration).

## 3. Build and publish for Windows IIS (one script)

From the **repository root**:

```powershell
powershell -ExecutionPolicy Bypass -File .\Publish-IIS.ps1
```

This writes a **single deploy folder** (default `.\iis-publish` next to the repo) containing the **API + embedded frontend** (everything IIS needs in one place).

Custom output path (absolute or relative to repo root):

```powershell
.\Publish-IIS.ps1 -DeployFolder "D:\Deploy\FbrSmartApp"
```

The script:

1. Runs `npm ci` and `npm run build`
2. Copies `dist/` into `backend/FbrSmartApp.Api/wwwroot/`
3. Runs `dotnet publish -c Release -o <your folder>`

Copy **the entire output folder** to the server and point the IIS site at it. The API will:

- Serve static files from `wwwroot`
- Fall back to `index.html` for client-side routes (`MapFallbackToFile`)
- Expose `/api/*` and `/uploads/*` as today

## 4. Manual publish (same result)

```bash
# Repo root
npm ci
npm run build

# Copy frontend
# Windows PowerShell: Remove-Item backend\FbrSmartApp.Api\wwwroot\* -Recurse -Exclude .gitkeep
# Then copy dist\* -> backend\FbrSmartApp.Api\wwwroot\

cd backend/FbrSmartApp.Api
dotnet publish -c Release -o ../../publish
```

## 5. Run on the server

### IIS: `ASPNETCORE_ENVIRONMENT`

The API project includes `web.config` with:

`<environmentVariable name="ASPNETCORE_ENVIRONMENT" value="Production" />`

inside `<aspNetCore>`. It is copied into your publish folder when you run `Publish-IIS.ps1`, so IIS loads **Production** without extra steps.

To override on one server only, edit that **`web.config`** next to `FbrSmartApp.Api.dll` after deploy, or set a machine-level / app-pool environment variable (less common). See [Environment variables in web.config](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/iis/web-config#setting-environment-variables).

### General

- **Kestrel** (Windows/Linux): run the published DLL / executable, typically behind **IIS**, **nginx**, or another reverse proxy on **HTTPS**.
- **SQL**: ensure the database exists and the connection string is correct. The app runs `EnsureCreated` + schema upgrader on startup; for strict production control, plan for **EF migrations** or scripted upgrades later.
- **Files**: `uploads/` is created next to the app for logos and attachments; ensure the process user has **write** permission there.
- **Reverse proxy**: if TLS terminates at nginx/IIS, enable **forwarded headers** so `Request.IsHttps` is correct for secure cookies (see [ASP.NET Core forwarded headers](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer)).

## 6. Development vs production CORS

`appsettings.json` includes `http://localhost:8000` for the Vite dev server. Production must set `Cors:AllowedOrigins` to your real SPA URL(s).

## 7. Security checklist

- [ ] Strong `JwtSigningKey` and non-default admin password  
- [ ] HTTPS only in production  
- [ ] SQL credentials not committed to git  
- [ ] `AllowedHosts` restricted if you do not need `*`  
- [ ] Firewall: only necessary ports open  

## 8. Docker (optional)

No Dockerfile is included by default. A typical approach is a multi-stage image: Node build → copy `wwwroot` → `dotnet publish` → final runtime image with ASP.NET 9. Add one if your team standardizes on containers.
