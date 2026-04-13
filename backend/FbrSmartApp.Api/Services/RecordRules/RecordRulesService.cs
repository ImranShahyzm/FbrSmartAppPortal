using System.Linq.Expressions;
using System.Security.Claims;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace FbrSmartApp.Api.Services.RecordRules;

public sealed class RecordRulesService
{
    private readonly AppDbContext _db;
    private readonly EffectivePermissionsService _effectivePermissions;
    private readonly RecordRulesUserVersionCache _versionCache;
    private readonly IMemoryCache _memoryCache;

    public RecordRulesService(
        AppDbContext db,
        EffectivePermissionsService effectivePermissions,
        RecordRulesUserVersionCache versionCache,
        IMemoryCache memoryCache)
    {
        _db = db;
        _effectivePermissions = effectivePermissions;
        _versionCache = versionCache;
        _memoryCache = memoryCache;
    }

    public static bool IsAdmin(User user) =>
        string.Equals(user.Role, "Admin", StringComparison.OrdinalIgnoreCase);

    public async Task<IQueryable<T>> ApplyReadFilterAsync<T>(
        IQueryable<T> query,
        User user,
        string permissionsPrefix,
        string modelKey,
        CancellationToken ct)
        where T : class
    {
        if (IsAdmin(user)) return query;
        if (!RecordRuleModelRegistry.TryGetEntityType(permissionsPrefix, modelKey, out var t) || t != typeof(T))
            return query;

        var pred = await GetCombinedPredicateAsync<T>(user, permissionsPrefix, modelKey, RecordRuleApplyMode.Read, ct);
        return pred is null ? query : query.Where(pred);
    }

    public Task<bool> SatisfiesReadAsync<T>(T entity, User user, string permissionsPrefix, string modelKey, CancellationToken ct)
        where T : class =>
        SatisfiesAsync(entity, user, permissionsPrefix, modelKey, RecordRuleApplyMode.Read, ct);

    public Task<bool> SatisfiesWriteAsync<T>(T entity, User user, string permissionsPrefix, string modelKey, CancellationToken ct)
        where T : class =>
        SatisfiesAsync(entity, user, permissionsPrefix, modelKey, RecordRuleApplyMode.Write, ct);

    public Task<bool> SatisfiesCreateAsync<T>(T entity, User user, string permissionsPrefix, string modelKey, CancellationToken ct)
        where T : class =>
        SatisfiesAsync(entity, user, permissionsPrefix, modelKey, RecordRuleApplyMode.Create, ct);

    public Task<bool> SatisfiesDeleteAsync<T>(T entity, User user, string permissionsPrefix, string modelKey, CancellationToken ct)
        where T : class =>
        SatisfiesAsync(entity, user, permissionsPrefix, modelKey, RecordRuleApplyMode.Delete, ct);

    private async Task<bool> SatisfiesAsync<T>(
        T entity,
        User user,
        string permissionsPrefix,
        string modelKey,
        RecordRuleApplyMode mode,
        CancellationToken ct)
        where T : class
    {
        if (IsAdmin(user)) return true;
        if (!RecordRuleModelRegistry.TryGetEntityType(permissionsPrefix, modelKey, out var t) || t != typeof(T))
            return true;

        var pred = await GetCombinedPredicateAsync<T>(user, permissionsPrefix, modelKey, mode, ct);
        if (pred is null) return true;
        return pred.Compile()(entity);
    }

    public async Task<Expression<Func<T, bool>>?> GetCombinedPredicateAsync<T>(
        User user,
        string permissionsPrefix,
        string modelKey,
        RecordRuleApplyMode mode,
        CancellationToken ct)
        where T : class
    {
        if (IsAdmin(user)) return null;
        if (!RecordRuleModelRegistry.TryGetEntityType(permissionsPrefix, modelKey, out var t) || t != typeof(T))
            return null;

        var v = _versionCache.GetVersion(user.Id);
        var cacheKey = $"rr:{user.Id:N}:{v}:{permissionsPrefix}:{modelKey}:{mode}:{typeof(T).Name}";
        return await _memoryCache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);
            return await BuildCombinedPredicateAsync<T>(user, permissionsPrefix, modelKey, mode, ct);
        });
    }

    private async Task<Expression<Func<T, bool>>?> BuildCombinedPredicateAsync<T>(
        User user,
        string permissionsPrefix,
        string modelKey,
        RecordRuleApplyMode mode,
        CancellationToken ct)
        where T : class
    {
        var groupIds = await _effectivePermissions.GetExpandedSecurityGroupIdsForUserAsync(user.Id, ct);
        if (groupIds.Count == 0) return null;

        var q = _db.GroupRecordRules.AsNoTracking()
            .Where(r => groupIds.Contains(r.SecurityGroupId))
            .Where(r => r.PermissionsPrefix == permissionsPrefix && r.ModelKey == modelKey)
            .Where(r => r.FieldName != null && r.Operator != null && r.RightOperandJson != null);

        q = mode switch
        {
            RecordRuleApplyMode.Read => q.Where(r => r.ApplyRead),
            RecordRuleApplyMode.Write => q.Where(r => r.ApplyWrite),
            RecordRuleApplyMode.Create => q.Where(r => r.ApplyCreate),
            RecordRuleApplyMode.Delete => q.Where(r => r.ApplyDelete),
            _ => q,
        };

        var rules = await q.ToListAsync(ct);
        if (rules.Count == 0) return null;

        var ctx = RecordRuleContextFactory.Create(user);

        var byGroup = rules.GroupBy(r => r.SecurityGroupId);
        var groupExprs = new List<Expression<Func<T, bool>>>();
        foreach (var g in byGroup)
        {
            var parts = new List<Expression<Func<T, bool>>>();
            foreach (var rule in g)
            {
                var expr = RecordRuleExpressionBuilder.TryBuild<T>(rule, ctx);
                if (expr != null) parts.Add(expr);
            }
            var combined = RecordRuleExpressionCombiner.CombineAnd(parts);
            if (combined != null) groupExprs.Add(combined);
        }

        return RecordRuleExpressionCombiner.CombineOr(groupExprs);
    }

    public static Guid? ParseUserId(ClaimsPrincipal principal)
    {
        var sub = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
