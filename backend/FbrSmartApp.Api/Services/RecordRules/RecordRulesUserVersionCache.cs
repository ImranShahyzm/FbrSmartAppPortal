using System.Collections.Concurrent;

namespace FbrSmartApp.Api.Services.RecordRules;

/// <summary>Bumps when effective permissions or group membership changes; invalidates compiled record-rule cache keys.</summary>
public sealed class RecordRulesUserVersionCache
{
    private readonly ConcurrentDictionary<Guid, int> _versions = new();

    public int GetVersion(Guid userId) => _versions.GetValueOrDefault(userId, 0);

    public void BumpUser(Guid userId) =>
        _versions.AddOrUpdate(userId, 1, (_, v) => v + 1);
}
