# FBR Smart App

A full-stack business application for managing **customers**, **products**, and **FBR (Federal Board of Revenue) digital invoices** in Pakistan. The web client is built with **React Admin** and **Material UI**. The API is **ASP.NET Core** with **Entity Framework Core** and **SQL Server**.

---

## Features

- **Invoice management**: Create and edit invoices on a single screen with line items, taxes, discounts, HS codes, and optional columns (discount %, tax amount, gross amount).
- **FBR integration**: Validate and post invoices to FBR; payload construction uses company and customer data (including customer **FBR Status** for buyer registration type).
- **Customers & products**: Customer profiles with FBR province, NTN/STN, logo upload; product profiles linked to the catalog.
- **UX** (Nano theme): App launcher, compact forms, invoice list with list/Kanban views, status chips, and chatter with server-side persistence where implemented.
- **Authentication**: JWT-based access with refresh handling in the data layer.

---

## Repository structure

| Path | Description |
|------|-------------|
| `src/` | React (Vite) application: resources, layouts, data provider, themes, i18n |
| `public/` | Static assets and MSW worker (if used for local mocking) |
| `backend/FbrSmartApp.Api/` | ASP.NET Core Web API, EF Core models, controllers, schema upgrades |
| `.env.production.example` | Example environment variables for production builds |

---

## Prerequisites

- **Node.js** (LTS recommended) and **npm**
- **.NET SDK** (9.x for this solution; see `backend/FbrSmartApp.Api/FbrSmartApp.Api.csproj`)
- **SQL Server** (connection string configured for the API)

---

## Frontend

### Install dependencies

```bash
npm install
```

### Development server

```bash
npm run dev
```

By default Vite serves the app (commonly `http://localhost:5173` unless configured otherwise). Point the UI at your API using environment variables (see below).

### Build

```bash
npm run build
```

### Type checking

```bash
npm run type-check
```

### API base URL

The client uses `VITE_API_BASE_URL` to reach the backend.

- **Same host as the API** (e.g. UI served from the API’s `wwwroot`): you can leave `VITE_API_BASE_URL` empty so requests go to `/api` on the current origin.
- **Split deployment** (static site + API on another host): set `VITE_API_BASE_URL` to your API root (no trailing slash required consistently with your `dataProvider`).

Copy `.env.production.example` to `.env.production` before production builds and adjust values. Do not commit secrets or production-only URLs if the repository is public.

---

## Backend API

### Run

```bash
cd backend/FbrSmartApp.Api
dotnet run
```

Default HTTP URL from launch settings: `http://localhost:5227` (see `Properties/launchSettings.json`).

### Database

The API uses EF Core with SQL Server. Schema changes are applied through the project’s **schema upgrader** on startup (idempotent migrations-style scripts). Ensure the connection string in configuration matches your environment.

---

## Configuration notes

- **CORS**: If the SPA runs on a different origin than the API, configure CORS on the API to allow the frontend origin.
- **JWT**: Tokens are typically stored client-side (e.g. `localStorage`); the data provider attaches `Authorization` headers for backend routes.

---

## Scripts summary

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript compile + production bundle |
| `npm run type-check` | Run `tsc` only |
| `npm run preview` | Preview the production build locally |
| `dotnet run` (in `backend/FbrSmartApp.Api`) | Run the API |

---

## Contributing

1. Create a branch for your change.
2. Run `npm run type-check` and `dotnet build` before opening a pull request.
3. Keep commits focused and messages clear.

---

## License

Specify your license here (e.g. MIT, proprietary). If this repository is private or internal-only, state that clearly.
