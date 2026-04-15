namespace FbrSmartApp.Api.Services;

/// <summary>
/// Metadata-only catalog: maps launcher app ids to permission prefix and lists securable resources.
/// Adding an app or resource here updates the permission catalog API and Admin seed expansion — no auth-engine conditionals.
/// </summary>
public static class PermissionCatalog
{
    public const string ClaimPermission = "permission";
    public const string ClaimAllowedApp = "app";

    public sealed record ResourceEntry(string Key, string Label);

    public sealed record AppCatalogEntry(
        string AppId,
        string PermissionsPrefix,
        string DisplayName,
        IReadOnlyList<ResourceEntry> Resources);

    /// <summary>
    /// Single source of truth is `shared/permission-catalog.manifest.json` (generated at build).
    /// </summary>
    public static IReadOnlyList<AppCatalogEntry> Apps => PermissionCatalogGenerated.Apps;

    private static readonly Dictionary<string, string> s_prefixToAppId =
        Apps.ToDictionary(a => a.PermissionsPrefix, a => a.AppId, StringComparer.OrdinalIgnoreCase);

    public static string? AppIdForPermissionPrefix(string prefix) =>
        s_prefixToAppId.TryGetValue(prefix, out var id) ? id : null;

    public static IEnumerable<string> AllPermissionStrings()
    {
        foreach (var app in Apps)
        {
            foreach (var res in app.Resources)
            {
                foreach (var action in Actions)
                    yield return $"{app.PermissionsPrefix}.{res.Key}.{action}";
            }
        }
    }

    public static readonly string[] Actions = ["read", "write", "create", "delete"];

    /// <summary>First segment of a permission string must match a known prefix.</summary>
    public static bool IsValidPermissionString(string s)
    {
        var parts = s.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length != 3) return false;
        return s_prefixToAppId.ContainsKey(parts[0]) &&
               Actions.Contains(parts[2], StringComparer.OrdinalIgnoreCase);
    }

    public static IReadOnlyList<string> AllowedAppIdsFromPermissions(IEnumerable<string> permissions)
    {
        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var p in permissions)
        {
            var i = p.IndexOf('.');
            if (i <= 0) continue;
            var prefix = p[..i];
            var appId = AppIdForPermissionPrefix(prefix);
            if (appId != null) set.Add(appId);
        }
        return set.OrderBy(x => x, StringComparer.OrdinalIgnoreCase).ToList();
    }
}
