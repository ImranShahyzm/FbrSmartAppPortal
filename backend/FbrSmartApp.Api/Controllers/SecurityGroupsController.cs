using System.Security.Claims;
using System.Text.Json;
using FbrSmartApp.Api.Auth;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using FbrSmartApp.Api.Services;
using FbrSmartApp.Api.Services.RecordRules;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/securityGroups")]
[Authorize]
public sealed class SecurityGroupsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly EffectivePermissionsService _effectivePermissions;
    private readonly RecordRuleFieldDiscoveryService _recordRuleFields;

    public SecurityGroupsController(
        AppDbContext db,
        EffectivePermissionsService effectivePermissions,
        RecordRuleFieldDiscoveryService recordRuleFields)
    {
        _db = db;
        _effectivePermissions = effectivePermissions;
        _recordRuleFields = recordRuleFields;
    }

    [HttpGet]
    [HasPermission("settings.securityGroups.read")]
    public async Task<IActionResult> GetList(
        [FromQuery] string? sort,
        [FromQuery] string? range,
        [FromQuery] string? filter,
        CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var query = _db.SecurityGroups.AsNoTracking().Where(x => x.CompanyId == companyId);

        if (!string.IsNullOrWhiteSpace(filter))
        {
            try
            {
                using var doc = JsonDocument.Parse(filter);
                if (doc.RootElement.TryGetProperty("q", out var qEl))
                {
                    var q = qEl.GetString();
                    if (!string.IsNullOrWhiteSpace(q))
                    {
                        var term = q.Trim();
                        query = query.Where(x =>
                            x.Name.Contains(term) || (x.ApplicationScope != null && x.ApplicationScope.Contains(term)));
                    }
                }
            }
            catch (JsonException)
            {
                // ignore malformed filter
            }
        }

        var total = await query.CountAsync(ct);
        var from = 0;
        var to = total - 1;
        if (!string.IsNullOrWhiteSpace(range))
        {
            try
            {
                var arr = JsonSerializer.Deserialize<int[]>(range);
                if (arr is { Length: >= 2 })
                {
                    from = arr[0];
                    to = arr[1];
                }
            }
            catch (JsonException)
            {
                // ignore
            }
        }

        var take = Math.Max(to - from + 1, 0);
        var rows = await query
            .OrderBy(x => x.Name)
            .Skip(from)
            .Take(take == 0 ? total : take)
            .Select(x => new SecurityGroupListDto
            {
                id = x.Id,
                name = x.Name,
                applicationScope = x.ApplicationScope,
                shareGroup = x.ShareGroup,
                apiKeysMaxDurationDays = x.ApiKeysMaxDurationDays,
                companyId = x.CompanyId,
            })
            .ToListAsync(ct);

        Response.Headers["Content-Range"] = $"securityGroups {from}-{from + Math.Max(rows.Count - 1, 0)}/{total}";
        return Ok(rows);
    }

    [HttpGet("{id:int}")]
    [HasPermission("settings.securityGroups.read")]
    public async Task<IActionResult> GetOne(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var g = await _db.SecurityGroups
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (g is null) return NotFound();

        var accessRights = await _db.GroupAccessRights.AsNoTracking()
            .Where(x => x.SecurityGroupId == id)
            .Select(x => new AccessRightDto
            {
                id = x.Id,
                displayName = x.DisplayName,
                permissionsPrefix = x.PermissionsPrefix,
                modelKey = x.ModelKey,
                canRead = x.CanRead,
                canWrite = x.CanWrite,
                canCreate = x.CanCreate,
                canDelete = x.CanDelete,
            })
            .ToListAsync(ct);

        var recordRules = await _db.GroupRecordRules.AsNoTracking()
            .Where(x => x.SecurityGroupId == id)
            .Select(x => new RecordRuleDto
            {
                id = x.Id,
                name = x.Name,
                permissionsPrefix = x.PermissionsPrefix,
                modelKey = x.ModelKey,
                domain = x.Domain,
                fieldName = x.FieldName,
                ruleOperator = x.Operator,
                rightOperandJson = x.RightOperandJson,
                applyRead = x.ApplyRead,
                applyWrite = x.ApplyWrite,
                applyCreate = x.ApplyCreate,
                applyDelete = x.ApplyDelete,
            })
            .ToListAsync(ct);

        var menuGrants = await _db.GroupMenuGrants.AsNoTracking()
            .Where(x => x.SecurityGroupId == id)
            .Select(x => new MenuGrantDto { id = x.Id, menuKey = x.MenuKey, visible = x.Visible })
            .ToListAsync(ct);

        var userIds = await _db.UserSecurityGroups.AsNoTracking()
            .Where(x => x.SecurityGroupId == id)
            .Select(x => x.UserId.ToString())
            .ToListAsync(ct);

        var parentGroupIds = await _db.SecurityGroupInheritances.AsNoTracking()
            .Where(x => x.SecurityGroupId == id)
            .Select(x => x.ParentSecurityGroupId)
            .ToListAsync(ct);

        return Ok(new SecurityGroupDetailDto
        {
            id = g.Id,
            name = g.Name,
            applicationScope = g.ApplicationScope,
            shareGroup = g.ShareGroup,
            apiKeysMaxDurationDays = g.ApiKeysMaxDurationDays,
            notes = g.Notes,
            companyId = g.CompanyId,
            accessRights = accessRights,
            recordRules = recordRules,
            menuGrants = menuGrants,
            userIds = userIds,
            parentGroupIds = parentGroupIds,
        });
    }

    public sealed class SecurityGroupSaveBody
    {
        public string? name { get; set; }
        public string? applicationScope { get; set; }
        public bool? shareGroup { get; set; }
        public decimal? apiKeysMaxDurationDays { get; set; }
        public string? notes { get; set; }
        public List<AccessRightDto>? accessRights { get; set; }
        public List<RecordRuleDto>? recordRules { get; set; }
        public List<MenuGrantDto>? menuGrants { get; set; }
        public List<string>? userIds { get; set; }
        public List<int>? parentGroupIds { get; set; }
    }

    [HttpPost]
    [HasPermission("settings.securityGroups.create")]
    public async Task<IActionResult> Create([FromBody] SecurityGroupSaveBody body, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var name = (body.name ?? "").Trim();
        if (name.Length == 0) return BadRequest(new { message = "Name is required." });

        var recordRulesError = await ValidateRecordRulesAsync(body.recordRules, ct);
        if (recordRulesError != null) return recordRulesError;

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            var g = new SecurityGroup
            {
                CompanyId = companyId,
                Name = name,
                ApplicationScope = string.IsNullOrWhiteSpace(body.applicationScope) ? null : body.applicationScope.Trim(),
                ShareGroup = body.shareGroup ?? false,
                ApiKeysMaxDurationDays = body.apiKeysMaxDurationDays,
                Notes = body.notes,
            };
            _db.SecurityGroups.Add(g);
            await _db.SaveChangesAsync(ct);

            await ReplaceChildrenAsync(g.Id, body, companyId, ct);
            await tx.CommitAsync(ct);

            await _effectivePermissions.InvalidateUsersInGroupAsync(g.Id, ct);
            return await GetOne(g.Id, ct);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    [HttpPut("{id:int}")]
    [HasPermission("settings.securityGroups.write")]
    public async Task<IActionResult> Update(int id, [FromBody] SecurityGroupSaveBody body, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var g = await _db.SecurityGroups.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (g is null) return NotFound();

        var name = (body.name ?? "").Trim();
        if (name.Length == 0) return BadRequest(new { message = "Name is required." });

        var recordRulesErrorUpdate = await ValidateRecordRulesAsync(body.recordRules, ct);
        if (recordRulesErrorUpdate != null) return recordRulesErrorUpdate;

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            g.Name = name;
            g.ApplicationScope = string.IsNullOrWhiteSpace(body.applicationScope) ? null : body.applicationScope.Trim();
            g.ShareGroup = body.shareGroup ?? false;
            g.ApiKeysMaxDurationDays = body.apiKeysMaxDurationDays;
            g.Notes = body.notes;

            _db.GroupAccessRights.RemoveRange(
                _db.GroupAccessRights.Where(x => x.SecurityGroupId == id));
            _db.GroupRecordRules.RemoveRange(
                _db.GroupRecordRules.Where(x => x.SecurityGroupId == id));
            _db.GroupMenuGrants.RemoveRange(
                _db.GroupMenuGrants.Where(x => x.SecurityGroupId == id));
            _db.UserSecurityGroups.RemoveRange(
                _db.UserSecurityGroups.Where(x => x.SecurityGroupId == id));
            _db.SecurityGroupInheritances.RemoveRange(
                _db.SecurityGroupInheritances.Where(x => x.SecurityGroupId == id));
            await _db.SaveChangesAsync(ct);

            await ReplaceChildrenAsync(id, body, companyId, ct);
            await tx.CommitAsync(ct);

            await _effectivePermissions.InvalidateUsersInGroupAsync(id, ct);
            return await GetOne(id, ct);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    [HttpDelete("{id:int}")]
    [HasPermission("settings.securityGroups.delete")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var g = await _db.SecurityGroups.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (g is null) return NotFound();

        var userIds = await _db.UserSecurityGroups.Where(x => x.SecurityGroupId == id).Select(x => x.UserId).ToListAsync(ct);

        _db.SecurityGroups.Remove(g);
        await _db.SaveChangesAsync(ct);

        foreach (var uid in userIds)
            await _effectivePermissions.PersistEffectivePermissionsAsync(uid, ct);

        return NoContent();
    }

    private async Task<IActionResult?> ValidateRecordRulesAsync(List<RecordRuleDto>? recordRules, CancellationToken ct)
    {
        if (recordRules == null) return null;
        foreach (var r in recordRules)
        {
            var prefix = (r.permissionsPrefix ?? "").Trim();
            var key = (r.modelKey ?? "").Trim();
            if (prefix.Length == 0 || key.Length == 0) continue;
            var fn = (r.fieldName ?? "").Trim();
            var ro = (r.ruleOperator ?? "").Trim();
            var json = (r.rightOperandJson ?? "").Trim();
            if (fn.Length == 0 && ro.Length == 0 && json.Length == 0)
                continue;
            if (!RecordRuleSaveValidator.TryValidateRow(prefix, key, r.fieldName, r.ruleOperator, r.rightOperandJson, out var err))
                return BadRequest(new { message = err });
            if (fn.Length > 0 &&
                !await _recordRuleFields.IsFieldVisibleForRecordRulesAsync(prefix, key, fn, ct))
            {
                return BadRequest(new
                {
                    message =
                        $"Field '{fn}' is not enabled for record rules. Enable it under Settings (wrench icon → record rule fields), or choose another field.",
                });
            }
        }
        return null;
    }

    private async Task ReplaceChildrenAsync(int groupId, SecurityGroupSaveBody body, int companyId, CancellationToken ct)
    {
        if (body.accessRights != null)
        {
            foreach (var r in body.accessRights)
            {
                var prefix = (r.permissionsPrefix ?? "").Trim();
                var key = (r.modelKey ?? "").Trim();
                if (prefix.Length == 0 || key.Length == 0) continue;
                _db.GroupAccessRights.Add(new GroupAccessRight
                {
                    SecurityGroupId = groupId,
                    DisplayName = (r.displayName ?? key).Trim(),
                    PermissionsPrefix = prefix,
                    ModelKey = key,
                    CanRead = r.canRead,
                    CanWrite = r.canWrite,
                    CanCreate = r.canCreate,
                    CanDelete = r.canDelete,
                });
            }
        }

        if (body.recordRules != null)
        {
            foreach (var r in body.recordRules)
            {
                var prefix = (r.permissionsPrefix ?? "").Trim();
                var key = (r.modelKey ?? "").Trim();
                if (prefix.Length == 0 || key.Length == 0) continue;
                _db.GroupRecordRules.Add(new GroupRecordRule
                {
                    SecurityGroupId = groupId,
                    Name = (r.name ?? "").Trim(),
                    PermissionsPrefix = prefix,
                    ModelKey = key,
                    Domain = r.domain,
                    FieldName = string.IsNullOrWhiteSpace(r.fieldName) ? null : r.fieldName.Trim(),
                    Operator = string.IsNullOrWhiteSpace(r.ruleOperator) ? null : r.ruleOperator.Trim(),
                    RightOperandJson = string.IsNullOrWhiteSpace(r.rightOperandJson) ? null : r.rightOperandJson.Trim(),
                    ApplyRead = r.applyRead,
                    ApplyWrite = r.applyWrite,
                    ApplyCreate = r.applyCreate,
                    ApplyDelete = r.applyDelete,
                });
            }
        }

        if (body.menuGrants != null)
        {
            foreach (var m in body.menuGrants)
            {
                var mk = (m.menuKey ?? "").Trim();
                if (mk.Length == 0) continue;
                _db.GroupMenuGrants.Add(new GroupMenuGrant
                {
                    SecurityGroupId = groupId,
                    MenuKey = mk,
                    Visible = m.visible,
                });
            }
        }

        if (body.userIds != null)
        {
            foreach (var uidStr in body.userIds)
            {
                if (!Guid.TryParse(uidStr, out var uid)) continue;
                var userOk = await _db.Users.AnyAsync(u => u.Id == uid && u.CompanyId == companyId, ct);
                if (!userOk) continue;
                _db.UserSecurityGroups.Add(new UserSecurityGroup { UserId = uid, SecurityGroupId = groupId });
            }
        }

        if (body.parentGroupIds != null)
        {
            foreach (var pid in body.parentGroupIds.Distinct())
            {
                if (pid == groupId) continue;
                var parentOk = await _db.SecurityGroups.AnyAsync(s => s.Id == pid && s.CompanyId == companyId, ct);
                if (!parentOk) continue;
                _db.SecurityGroupInheritances.Add(new SecurityGroupInheritance
                {
                    SecurityGroupId = groupId,
                    ParentSecurityGroupId = pid,
                });
            }
        }

        await _db.SaveChangesAsync(ct);
    }

    private int GetCompanyIdOrThrow()
    {
        var raw = User.FindFirstValue("companyId");
        if (!int.TryParse(raw, out var companyId))
            throw new UnauthorizedAccessException("Missing companyId claim.");
        return companyId;
    }

    public sealed class SecurityGroupListDto
    {
        public int id { get; set; }
        public string name { get; set; } = "";
        public string? applicationScope { get; set; }
        public bool shareGroup { get; set; }
        public decimal? apiKeysMaxDurationDays { get; set; }
        public int companyId { get; set; }
    }

    public sealed class SecurityGroupDetailDto
    {
        public int id { get; set; }
        public string name { get; set; } = "";
        public string? applicationScope { get; set; }
        public bool shareGroup { get; set; }
        public decimal? apiKeysMaxDurationDays { get; set; }
        public string? notes { get; set; }
        public int companyId { get; set; }
        public List<AccessRightDto> accessRights { get; set; } = [];
        public List<RecordRuleDto> recordRules { get; set; } = [];
        public List<MenuGrantDto> menuGrants { get; set; } = [];
        public List<string> userIds { get; set; } = [];
        public List<int> parentGroupIds { get; set; } = [];
    }

    public sealed class AccessRightDto
    {
        public int id { get; set; }
        public string displayName { get; set; } = "";
        public string permissionsPrefix { get; set; } = "";
        public string modelKey { get; set; } = "";
        public bool canRead { get; set; }
        public bool canWrite { get; set; }
        public bool canCreate { get; set; }
        public bool canDelete { get; set; }
    }

    public sealed class RecordRuleDto
    {
        public int id { get; set; }
        public string name { get; set; } = "";
        public string permissionsPrefix { get; set; } = "";
        public string modelKey { get; set; } = "";
        public string? domain { get; set; }
        public string? fieldName { get; set; }
        public string? ruleOperator { get; set; }
        public string? rightOperandJson { get; set; }
        public bool applyRead { get; set; }
        public bool applyWrite { get; set; }
        public bool applyCreate { get; set; }
        public bool applyDelete { get; set; }
    }

    public sealed class MenuGrantDto
    {
        public int id { get; set; }
        public string menuKey { get; set; } = "";
        public bool visible { get; set; }
    }
}
