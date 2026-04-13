using FbrSmartApp.Api.Auth;
using FbrSmartApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/security/permission-catalog")]
[Authorize]
[HasPermission("settings.securityGroups.read")]
public sealed class PermissionCatalogController : ControllerBase
{
    [HttpGet]
    public ActionResult<IReadOnlyList<PermissionCatalogResponseApp>> Get()
    {
        var list = PermissionCatalog.Apps
            .Select(a => new PermissionCatalogResponseApp(
                a.AppId,
                a.PermissionsPrefix,
                a.DisplayName,
                a.Resources.Select(r => new PermissionCatalogResponseResource(r.Key, r.Label)).ToList()))
            .ToList();
        return Ok(list);
    }

    public sealed record PermissionCatalogResponseResource(string Key, string Label);

    public sealed record PermissionCatalogResponseApp(
        string AppId,
        string PermissionsPrefix,
        string DisplayName,
        IReadOnlyList<PermissionCatalogResponseResource> Resources);
}
