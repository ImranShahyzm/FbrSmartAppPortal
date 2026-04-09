<#
.SYNOPSIS
  Builds the React (Vite) frontend and publishes the ASP.NET Core API into one folder for Windows IIS.

.DESCRIPTION
  1. npm ci + npm run build (frontend)
  2. Copies dist\ -> backend\FbrSmartApp.Api\wwwroot\
  3. dotnet publish -c Release -o <your folder>

  Copy the entire output folder to the IIS server. Point the IIS site physical path at that folder.
  Install the ASP.NET Core 9 Hosting Bundle on the server if you have not already.

.PARAMETER DeployFolder
  Where to publish. Relative paths are under the repo root. Default: iis-publish

.EXAMPLE
  .\Publish-IIS.ps1
  .\Publish-IIS.ps1 -DeployFolder "D:\Deploy\FbrSmartApp"
#>
param(
    [Parameter(Mandatory = $false)]
    [string] $DeployFolder = "iis-publish"
)

$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($repoRoot)) {
    $repoRoot = Get-Location
}

if ([System.IO.Path]::IsPathRooted($DeployFolder)) {
    $outPath = $DeployFolder
} else {
    $outPath = Join-Path $repoRoot $DeployFolder
}

$apiDir = Join-Path $repoRoot "backend\FbrSmartApp.Api"
$wwwroot = Join-Path $apiDir "wwwroot"
$dist = Join-Path $repoRoot "dist"

Write-Host ""
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host " FBR Smart App - IIS publish (full stack)" -ForegroundColor Cyan
Write-Host " Output: $outPath" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $repoRoot

if (-not (Test-Path (Join-Path $repoRoot ".env.production"))) {
    Write-Host "TIP: Add .env.production with VITE_API_BASE_URL= for same-host IIS (see .env.production.example)." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "[1/3] npm ci ..." -ForegroundColor Green
npm ci
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[2/3] npm run build ..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path $dist)) {
    Write-Error "Build failed: dist folder not found."
}

Write-Host "      Copy dist -> wwwroot ..." -ForegroundColor DarkGray
New-Item -ItemType Directory -Force -Path $wwwroot | Out-Null
Get-ChildItem -Path $wwwroot -Force | Where-Object { $_.Name -ne ".gitkeep" } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $dist "*") -Destination $wwwroot -Recurse -Force

New-Item -ItemType Directory -Force -Path $outPath | Out-Null
$outResolved = (Resolve-Path $outPath).Path

Write-Host "[3/3] dotnet publish -c Release -o `"$outResolved`" ..." -ForegroundColor Green
Set-Location $apiDir
dotnet publish -c Release -o $outResolved
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location $repoRoot

Write-Host ""
Write-Host "SUCCESS. Copy this entire folder to your IIS server:" -ForegroundColor Green
Write-Host "  $outResolved" -ForegroundColor White
Write-Host ""
Write-Host "IIS quick checklist:" -ForegroundColor Cyan
Write-Host "  - Install .NET 9 Hosting Bundle (includes ASP.NET Core Module)." -ForegroundColor Gray
Write-Host "  - Site physical path = folder above (contains FbrSmartApp.Api.dll and wwwroot\)." -ForegroundColor Gray
Write-Host "  - Application pool: No Managed Code, 64-bit." -ForegroundColor Gray
Write-Host "  - ASPNETCORE_ENVIRONMENT=Production is set in web.config (published with the app)." -ForegroundColor Gray
Write-Host "  - Edit appsettings.Production.json on the server (SQL, JWT, Cors, admin password)." -ForegroundColor Gray
Write-Host ""
