using Microsoft.AspNetCore.Authorization;

namespace FbrSmartApp.Api.Auth;

/// <summary>Requires a flat permission string (e.g. accounting.glChartAccounts.read). Admin role bypasses.</summary>
public sealed class HasPermissionAttribute : AuthorizeAttribute
{
    public HasPermissionAttribute(string permission) => Policy = "perm:" + permission;
}
