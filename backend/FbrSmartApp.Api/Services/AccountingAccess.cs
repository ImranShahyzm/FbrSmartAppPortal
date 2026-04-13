using System.Text.Json;
using FbrSmartApp.Api.Models;

namespace FbrSmartApp.Api.Services;

/// <summary>ERP-style module checks for accounting features (driven by Users.AccessRightsJson).</summary>
public static class AccountingAccess
{
    public static bool IsAdmin(User user) =>
        string.Equals(user.Role, "Admin", StringComparison.OrdinalIgnoreCase);

    public static bool CanReadChartOfAccounts(User user)
    {
        if (IsAdmin(user)) return true;
        return ReadCoaFlag(user.AccessRightsJson, "read");
    }

    public static bool CanWriteChartOfAccounts(User user)
    {
        if (IsAdmin(user)) return true;
        return ReadCoaFlag(user.AccessRightsJson, "write");
    }

    private static bool ReadCoaFlag(string? json, string flag)
    {
        if (string.IsNullOrWhiteSpace(json)) return false;
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (!root.TryGetProperty("modules", out var modules)) return false;
            if (!modules.TryGetProperty("accounting", out var accounting)) return false;
            if (!accounting.TryGetProperty("chartOfAccounts", out var coa)) return false;
            if (!coa.TryGetProperty(flag, out var el)) return false;
            return el.ValueKind == JsonValueKind.True;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}
