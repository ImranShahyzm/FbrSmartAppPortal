using Microsoft.AspNetCore.Authorization;

namespace FbrSmartApp.Api.Auth;

public sealed class PermissionRequirement : IAuthorizationRequirement
{
    public string Permission { get; }

    public PermissionRequirement(string permission) => Permission = permission;
}
