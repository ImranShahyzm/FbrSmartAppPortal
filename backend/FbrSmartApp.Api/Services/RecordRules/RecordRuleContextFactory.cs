using System.Text.Json;
using FbrSmartApp.Api.Models;

namespace FbrSmartApp.Api.Services.RecordRules;

public static class RecordRuleContextFactory
{
    public static RecordRuleContext Create(User user)
    {
        var allowed = ParseAllowedCompanyIds(user.AllowedCompanyIdsJson);
        if (allowed.Count == 0)
            allowed = new[] { user.CompanyId };
        return new RecordRuleContext
        {
            UserId = user.Id,
            CompanyId = user.CompanyId,
            AllowedCompanyIds = allowed,
        };
    }

    private static IReadOnlyList<int> ParseAllowedCompanyIds(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return Array.Empty<int>();
        try
        {
            var ids = JsonSerializer.Deserialize<int[]>(json);
            if (ids is { Length: > 0 }) return ids;
        }
        catch (JsonException)
        {
            // ignored
        }
        return Array.Empty<int>();
    }
}
