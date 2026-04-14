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

    public static IReadOnlyList<AppCatalogEntry> Apps { get; } =
    [
        new AppCatalogEntry(
            "fbr-smart",
            "fbr",
            "FBR Smart",
            [
                new ResourceEntry("customers", "Customers"),
                new ResourceEntry("fbrInvoices", "FBR Invoices"),
                new ResourceEntry("products", "Products"),
                new ResourceEntry("productProfiles", "Product profiles"),
                new ResourceEntry("fbrScenarios", "FBR scenarios"),
                new ResourceEntry("fbrSalesTaxRates", "Sales tax rates"),
                new ResourceEntry("companies", "Companies"),
                new ResourceEntry("categories", "Categories"),
                new ResourceEntry("reviews", "Reviews"),
            ]),
        new AppCatalogEntry(
            "accounting-suite",
            "accounting",
            "Accounting",
            [
                new ResourceEntry("glChartAccounts", "Chart of accounts"),
                new ResourceEntry("glVoucherTypes", "Voucher types"),
                new ResourceEntry("glJournalVouchers", "Journal vouchers"),
                new ResourceEntry("glAccountTypes", "GL account types"),
                new ResourceEntry("accountingReports", "Accounting reports"),
                new ResourceEntry("customers", "Customers"),
                new ResourceEntry("genBankInformation", "Bank information"),
                new ResourceEntry("genCashInformation", "Cash information"),
            ]),
        new AppCatalogEntry(
            "settings",
            "settings",
            "Settings",
            [
                new ResourceEntry("securityGroups", "Security groups"),
                new ResourceEntry("users", "Users"),
            ]),
    ];

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
