using System.Text.Json;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using FbrSmartApp.Api.Services.RecordRules;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Services;

public sealed class EffectivePermissionsService
{
    private readonly AppDbContext _db;
    private readonly RecordRulesUserVersionCache _recordRulesVersionCache;

    public EffectivePermissionsService(AppDbContext db, RecordRulesUserVersionCache recordRulesVersionCache)
    {
        _db = db;
        _recordRulesVersionCache = recordRulesVersionCache;
    }

    /// <summary>Security groups for the user plus parent groups from inheritance (same expansion as access rights).</summary>
    public async Task<HashSet<int>> GetExpandedSecurityGroupIdsForUserAsync(Guid userId, CancellationToken ct)
    {
        var groupIds = await _db.UserSecurityGroups.AsNoTracking()
            .Where(x => x.UserId == userId)
            .Select(x => x.SecurityGroupId)
            .ToListAsync(ct);
        var visited = new HashSet<int>();
        await CollectExpandedGroupIdsRecursiveAsync(groupIds, visited, ct);
        return visited;
    }

    private async Task CollectExpandedGroupIdsRecursiveAsync(
        IEnumerable<int> groupIds,
        HashSet<int> visited,
        CancellationToken ct)
    {
        foreach (var gid in groupIds)
        {
            if (!visited.Add(gid)) continue;

            var parents = await _db.SecurityGroupInheritances.AsNoTracking()
                .Where(x => x.SecurityGroupId == gid)
                .Select(x => x.ParentSecurityGroupId)
                .ToListAsync(ct);
            if (parents.Count > 0)
                await CollectExpandedGroupIdsRecursiveAsync(parents, visited, ct);
        }
    }

    public static IReadOnlyList<string> PermissionsForAdmin() =>
        PermissionCatalog.AllPermissionStrings().ToList();

    /// <summary>Migrate legacy nested JSON to flat strings (no DB write).</summary>
    public static IReadOnlyList<string>? ExpandLegacyAccessRightsJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (!root.TryGetProperty("modules", out var modules)) return null;
            var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (modules.TryGetProperty("accounting", out var accounting) &&
                accounting.TryGetProperty("chartOfAccounts", out var coa))
            {
                if (coa.TryGetProperty("read", out var r) && r.ValueKind == JsonValueKind.True)
                    set.Add("accounting.glChartAccounts.read");
                if (coa.TryGetProperty("write", out var w) && w.ValueKind == JsonValueKind.True)
                {
                    set.Add("accounting.glChartAccounts.write");
                    set.Add("accounting.glChartAccounts.create");
                    set.Add("accounting.glChartAccounts.delete");
                }
            }
            return set.Count > 0 ? set.ToList() : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public static void ExpandAccessRightRow(GroupAccessRight row, ISet<string> target)
    {
        var prefix = row.PermissionsPrefix.Trim();
        var key = row.ModelKey.Trim();
        if (prefix.Length == 0 || key.Length == 0) return;
        if (row.CanRead) target.Add($"{prefix}.{key}.read");
        if (row.CanWrite) target.Add($"{prefix}.{key}.write");
        if (row.CanCreate) target.Add($"{prefix}.{key}.create");
        if (row.CanDelete) target.Add($"{prefix}.{key}.delete");
    }

    public async Task<IReadOnlyList<string>> ComputeEffectivePermissionsAsync(User user, CancellationToken ct)
    {
        if (string.Equals(user.Role, "Admin", StringComparison.OrdinalIgnoreCase))
            return PermissionsForAdmin();

        var merged = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var groupIds = await _db.UserSecurityGroups.AsNoTracking()
            .Where(x => x.UserId == user.Id)
            .Select(x => x.SecurityGroupId)
            .ToListAsync(ct);

        if (groupIds.Count > 0)
        {
            var visited = new HashSet<int>();
            await CollectGroupPermissionsRecursiveAsync(groupIds, merged, visited, ct);
        }

        if (merged.Count == 0)
        {
            var legacy = ExpandLegacyAccessRightsJson(user.AccessRightsJson);
            if (legacy != null)
            {
                foreach (var p in legacy) merged.Add(p);
            }
        }

        return merged.OrderBy(x => x, StringComparer.OrdinalIgnoreCase).ToList();
    }

    private async Task CollectGroupPermissionsRecursiveAsync(
        IEnumerable<int> groupIds,
        ISet<string> target,
        ISet<int> visited,
        CancellationToken ct)
    {
        foreach (var gid in groupIds)
        {
            if (!visited.Add(gid)) continue;

            var rights = await _db.GroupAccessRights.AsNoTracking()
                .Where(x => x.SecurityGroupId == gid)
                .ToListAsync(ct);
            foreach (var r in rights)
                ExpandAccessRightRow(r, target);

            var parents = await _db.SecurityGroupInheritances.AsNoTracking()
                .Where(x => x.SecurityGroupId == gid)
                .Select(x => x.ParentSecurityGroupId)
                .ToListAsync(ct);
            if (parents.Count > 0)
                await CollectGroupPermissionsRecursiveAsync(parents, target, visited, ct);
        }
    }

    public async Task PersistEffectivePermissionsAsync(Guid userId, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return;

        var effective = await ComputeEffectivePermissionsAsync(user, ct);
        user.PermissionsJson = JsonSerializer.Serialize(effective);
        await _db.SaveChangesAsync(ct);
        _recordRulesVersionCache.BumpUser(userId);
    }

    public async Task InvalidateUsersInGroupAsync(int securityGroupId, CancellationToken ct)
    {
        var userIds = await _db.UserSecurityGroups.AsNoTracking()
            .Where(x => x.SecurityGroupId == securityGroupId)
            .Select(x => x.UserId)
            .Distinct()
            .ToListAsync(ct);
        foreach (var uid in userIds)
            await PersistEffectivePermissionsAsync(uid, ct);
    }
}
