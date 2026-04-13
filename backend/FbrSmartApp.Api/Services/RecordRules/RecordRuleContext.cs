namespace FbrSmartApp.Api.Services.RecordRules;

/// <summary>Resolved values for dynamic rule operands (built per request).</summary>
public sealed class RecordRuleContext
{
    public required Guid UserId { get; init; }
    public required int CompanyId { get; init; }
    public required IReadOnlyList<int> AllowedCompanyIds { get; init; }

    public object? ResolveContextRef(string refName)
    {
        var r = refName.Trim();
        if (string.Equals(r, "currentUser.id", StringComparison.OrdinalIgnoreCase))
            return UserId;
        if (string.Equals(r, "currentUser.companyId", StringComparison.OrdinalIgnoreCase))
            return CompanyId;
        if (string.Equals(r, "currentUser.allowedCompanyIds", StringComparison.OrdinalIgnoreCase))
            return AllowedCompanyIds.ToArray();
        return null;
    }
}
