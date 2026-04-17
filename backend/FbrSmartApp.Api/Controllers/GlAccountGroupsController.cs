using System.Security.Claims;
using System.Text.Json;
using System.Text.RegularExpressions;
using FbrSmartApp.Api.Auth;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using FbrSmartApp.Api.Services.RecordRules;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/glAccountGroups")]
[Authorize]
public sealed class GlAccountGroupsController : ControllerBase
{
    private static readonly Regex HexColorRegex = new("^#[0-9A-Fa-f]{6}$", RegexOptions.Compiled);

    private readonly AppDbContext _db;
    private readonly RecordRulesService _recordRules;

    public GlAccountGroupsController(AppDbContext db, RecordRulesService recordRules)
    {
        _db = db;
        _recordRules = recordRules;
    }

    [HttpGet]
    [HasPermission("accounting.glAccountGroups.read")]
    public async Task<IActionResult> GetList(
        [FromQuery] string? sort,
        [FromQuery] string? range,
        [FromQuery] string? filter,
        CancellationToken ct)
    {
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var query = _db.GlAccountGroups.AsNoTracking()
            .Where(x => x.CompanyId == companyId);
        query = await _recordRules.ApplyReadFilterAsync(query, user, "accounting", "glAccountGroups", ct);

        if (!string.IsNullOrWhiteSpace(filter))
        {
            try
            {
                using var doc = JsonDocument.Parse(filter);
                if (doc.RootElement.TryGetProperty("q", out var qEl))
                {
                    var q = (qEl.GetString() ?? "").Trim();
                    if (!string.IsNullOrWhiteSpace(q))
                        query = query.Where(x => x.GroupName.Contains(q));
                }
            }
            catch (JsonException)
            {
                // ignore bad filter
            }
        }

        query = ApplySort(query, sort);

        var total = await query.CountAsync(ct);

        var from = 0;
        var to = Math.Min(24, Math.Max(total - 1, 0));
        if (!string.IsNullOrWhiteSpace(range))
        {
            try
            {
                var arr = JsonSerializer.Deserialize<int[]>(range);
                if (arr is { Length: >= 2 })
                {
                    from = Math.Max(0, arr[0]);
                    to = Math.Max(from, arr[1]);
                }
            }
            catch (JsonException)
            {
                // defaults
            }
        }

        var take = Math.Min(to - from + 1, 1000);
        var rows = await query.Skip(from).Take(take).ToListAsync(ct);

        var dtos = rows.Select(x => new GlAccountGroupListDto
        {
            id = x.Id,
            groupName = x.GroupName,
            fromCode = x.FromCode,
            toCode = x.ToCode,
            parentGroupId = x.ParentGroupId,
            colorHex = x.ColorHex,
            createdAtUtc = x.CreatedAtUtc,
            updatedAtUtc = x.UpdatedAtUtc,
        }).ToList();

        Response.Headers["Content-Range"] =
            $"glAccountGroups {from}-{from + Math.Max(dtos.Count - 1, 0)}/{total}";
        return Ok(dtos);
    }

    [HttpGet("{id:int}")]
    [HasPermission("accounting.glAccountGroups.read")]
    public async Task<IActionResult> GetOne(int id, CancellationToken ct)
    {
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var entity = await _db.GlAccountGroups.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (entity is null) return NotFound();

        if (!await _recordRules.SatisfiesReadAsync(entity, user, "accounting", "glAccountGroups", ct))
            return Forbid();

        return Ok(new GlAccountGroupDetailDto
        {
            id = entity.Id,
            groupName = entity.GroupName,
            fromCode = entity.FromCode,
            toCode = entity.ToCode,
            parentGroupId = entity.ParentGroupId,
            colorHex = entity.ColorHex,
            createdAtUtc = entity.CreatedAtUtc,
            updatedAtUtc = entity.UpdatedAtUtc,
        });
    }

    [HttpGet("tree")]
    [HasPermission("accounting.glAccountGroups.read")]
    public async Task<IActionResult> GetTree(CancellationToken ct)
    {
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var query = _db.GlAccountGroups.AsNoTracking()
            .Where(x => x.CompanyId == companyId);
        query = await _recordRules.ApplyReadFilterAsync(query, user, "accounting", "glAccountGroups", ct);

        var rows = await query
            .OrderBy(x => x.FromCode).ThenBy(x => x.GroupName).ThenBy(x => x.Id)
            .ToListAsync(ct);

        var nodesById = rows.ToDictionary(
            x => x.Id,
            x => new GlAccountGroupTreeNodeDto
            {
                id = x.Id,
                groupName = x.GroupName,
                fromCode = x.FromCode,
                toCode = x.ToCode,
                parentGroupId = x.ParentGroupId,
                colorHex = x.ColorHex,
                children = [],
            });

        var roots = new List<GlAccountGroupTreeNodeDto>();
        foreach (var n in nodesById.Values.OrderBy(x => x.fromCode).ThenBy(x => x.groupName).ThenBy(x => x.id))
        {
            if (n.parentGroupId is int pid && nodesById.TryGetValue(pid, out var parent))
                parent.children.Add(n);
            else
                roots.Add(n);
        }

        return Ok(roots);
    }

    [HttpGet("parentOptions")]
    [HasPermission("accounting.glAccountGroups.read")]
    public async Task<IActionResult> GetParentOptions([FromQuery] int? excludeId, CancellationToken ct)
    {
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var query = _db.GlAccountGroups.AsNoTracking()
            .Where(x => x.CompanyId == companyId);
        query = await _recordRules.ApplyReadFilterAsync(query, user, "accounting", "glAccountGroups", ct);

        var rows = await query
            .OrderBy(x => x.FromCode).ThenBy(x => x.GroupName).ThenBy(x => x.Id)
            .ToListAsync(ct);

        if (excludeId is int ex)
        {
            var byId = rows.ToDictionary(x => x.Id, x => x);
            var blocked = CollectDescendantIds(ex, byId);
            blocked.Add(ex);
            rows = rows.Where(x => !blocked.Contains(x.Id)).ToList();
        }

        var childrenByParent = rows
            .GroupBy(x => x.ParentGroupId ?? 0)
            .ToDictionary(g => g.Key, g => g.ToList());

        var result = new List<GlAccountGroupParentOptionDto>();
        AddOptionsRecursive(0, 0);
        return Ok(result);

        void AddOptionsRecursive(int parentId, int depth)
        {
            if (!childrenByParent.TryGetValue(parentId, out var kids))
                return;
            foreach (var k in kids.OrderBy(x => x.FromCode).ThenBy(x => x.GroupName).ThenBy(x => x.Id))
            {
                result.Add(new GlAccountGroupParentOptionDto
                {
                    id = k.Id,
                    groupName = k.GroupName,
                    fromCode = k.FromCode,
                    toCode = k.ToCode,
                    parentGroupId = k.ParentGroupId,
                    depth = depth,
                    colorHex = k.ColorHex,
                });
                AddOptionsRecursive(k.Id, depth + 1);
            }
        }
    }

    [HttpGet("resolve")]
    [HasPermission("accounting.glAccountGroups.read")]
    public async Task<IActionResult> ResolveGroup([FromQuery] long? accountCode, CancellationToken ct)
    {
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        if (accountCode is null)
            return BadRequest(new { message = "accountCode is required." });

        var companyId = GetCompanyIdOrThrow();
        var query = _db.GlAccountGroups.AsNoTracking()
            .Where(x => x.CompanyId == companyId && x.FromCode <= accountCode.Value && x.ToCode >= accountCode.Value);
        query = await _recordRules.ApplyReadFilterAsync(query, user, "accounting", "glAccountGroups", ct);

        var rows = await query
            .OrderBy(x => (x.ToCode - x.FromCode))
            .ThenBy(x => x.FromCode)
            .ThenBy(x => x.Id)
            .Take(1)
            .ToListAsync(ct);

        var match = rows.FirstOrDefault();
        if (match is null) return Ok(null);

        return Ok(new GlAccountGroupResolvedDto
        {
            id = match.Id,
            groupName = match.GroupName,
            fromCode = match.FromCode,
            toCode = match.ToCode,
            parentGroupId = match.ParentGroupId,
            colorHex = match.ColorHex,
        });
    }

    [HttpGet("{id:int}/accounts")]
    [HasPermission("accounting.glChartAccounts.read")]
    public async Task<IActionResult> GetAccountsForGroup(int id, CancellationToken ct)
    {
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var group = await _db.GlAccountGroups.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (group is null) return NotFound();

        if (!await _recordRules.SatisfiesReadAsync(group, user, "accounting", "glAccountGroups", ct))
            return Forbid();

        var from = group.FromCode;
        var to = group.ToCode;

        // GLCode is stored as NVARCHAR; filter server-side using TRY_CONVERT for performance.
        var raw = _db.GlChartOfAccounts.FromSqlInterpolated(
            $"""
             SELECT *
             FROM dbo.GLChartOFAccount
             WHERE Companyid = {companyId}
               AND GLCode IS NOT NULL
               AND GLCode NOT LIKE '%[^0-9]%'
               AND TRY_CONVERT(bigint, GLCode) BETWEEN {from} AND {to}
             """
        ).AsNoTracking();

        raw = await _recordRules.ApplyReadFilterAsync(raw, user, "accounting", "glChartAccounts", ct);

        var rows = await raw
            .OrderBy(x => x.GlCode ?? "")
            .ThenBy(x => x.Id)
            .Select(x => new GlChartAccountRowDto
            {
                id = x.Id,
                glCode = x.GlCode,
                glTitle = x.GlTitle,
                glType = x.GlType,
                glNature = x.GlNature,
            })
            .ToListAsync(ct);

        return Ok(rows);
    }

    [HttpPost]
    [HasPermission("accounting.glAccountGroups.create")]
    public async Task<IActionResult> Create([FromBody] JsonElement body, CancellationToken ct)
    {
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        if (body.ValueKind != JsonValueKind.Object)
            return BadRequest(new { message = "Invalid JSON body." });

        var parsed = ParseWriteBody(body, out var err);
        if (parsed is null) return BadRequest(new { message = err ?? "Invalid request." });

        var entity = new GlAccountGroup
        {
            CompanyId = companyId,
            GroupName = parsed.GroupName,
            FromCode = parsed.FromCode,
            ToCode = parsed.ToCode,
            ParentGroupId = parsed.ParentGroupId,
            ColorHex = parsed.ColorHex,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow,
        };

        var validation = await ValidateSaveAsync(entity, null, user, companyId, ct);
        if (validation is not null) return validation;

        if (!await _recordRules.SatisfiesCreateAsync(entity, user, "accounting", "glAccountGroups", ct))
            return Forbid();

        _db.GlAccountGroups.Add(entity);
        await _db.SaveChangesAsync(ct);

        return Ok(new GlAccountGroupDetailDto
        {
            id = entity.Id,
            groupName = entity.GroupName,
            fromCode = entity.FromCode,
            toCode = entity.ToCode,
            parentGroupId = entity.ParentGroupId,
            colorHex = entity.ColorHex,
            createdAtUtc = entity.CreatedAtUtc,
            updatedAtUtc = entity.UpdatedAtUtc,
        });
    }

    [HttpPatch("{id:int}")]
    [HasPermission("accounting.glAccountGroups.write")]
    public Task<IActionResult> Patch(int id, [FromBody] JsonElement body, CancellationToken ct)
        => ApplyUpdateAsync(id, body, ct);

    [HttpPut("{id:int}")]
    [HasPermission("accounting.glAccountGroups.write")]
    public Task<IActionResult> Put(int id, [FromBody] JsonElement body, CancellationToken ct)
        => ApplyUpdateAsync(id, body, ct);

    private async Task<IActionResult> ApplyUpdateAsync(int id, JsonElement body, CancellationToken ct)
    {
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var entity = await _db.GlAccountGroups.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (entity is null) return NotFound();

        if (!await _recordRules.SatisfiesWriteAsync(entity, user, "accounting", "glAccountGroups", ct))
            return Forbid();

        if (body.ValueKind != JsonValueKind.Object)
            return BadRequest(new { message = "Invalid JSON body." });

        var parsed = ParsePartialWriteBody(body, out var err);
        if (parsed is null) return BadRequest(new { message = err ?? "Invalid request." });

        if (parsed.GroupName is not null) entity.GroupName = parsed.GroupName;
        if (parsed.FromCode is not null) entity.FromCode = parsed.FromCode.Value;
        if (parsed.ToCode is not null) entity.ToCode = parsed.ToCode.Value;
        if (parsed.ParentGroupIdSpecified) entity.ParentGroupId = parsed.ParentGroupId;
        if (parsed.ColorHex is not null) entity.ColorHex = parsed.ColorHex;
        entity.UpdatedAtUtc = DateTime.UtcNow;

        var validation = await ValidateSaveAsync(entity, id, user, companyId, ct);
        if (validation is not null) return validation;

        await _db.SaveChangesAsync(ct);

        return Ok(new GlAccountGroupDetailDto
        {
            id = entity.Id,
            groupName = entity.GroupName,
            fromCode = entity.FromCode,
            toCode = entity.ToCode,
            parentGroupId = entity.ParentGroupId,
            colorHex = entity.ColorHex,
            createdAtUtc = entity.CreatedAtUtc,
            updatedAtUtc = entity.UpdatedAtUtc,
        });
    }

    [HttpDelete("{id:int}")]
    [HasPermission("accounting.glAccountGroups.delete")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var entity = await _db.GlAccountGroups.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (entity is null) return NotFound();

        if (!await _recordRules.SatisfiesWriteAsync(entity, user, "accounting", "glAccountGroups", ct))
            return Forbid();

        var hasChildren = await _db.GlAccountGroups.AsNoTracking()
            .AnyAsync(x => x.CompanyId == companyId && x.ParentGroupId == id, ct);
        if (hasChildren)
            return BadRequest(new { message = "This group has child groups; delete children first." });

        _db.GlAccountGroups.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return Ok(new { id = id });
    }

    private async Task<IActionResult?> ValidateSaveAsync(
        GlAccountGroup entity,
        int? currentId,
        User user,
        int companyId,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(entity.GroupName))
            return BadRequest(new { message = "Group name is required." });

        if (entity.FromCode >= entity.ToCode)
            return BadRequest(new { message = "From code must be less than To code." });

        if (string.IsNullOrWhiteSpace(entity.ColorHex) || !HexColorRegex.IsMatch(entity.ColorHex))
            return BadRequest(new { message = "Color must be a valid HEX value like #FF5733." });

        if (entity.ParentGroupId is int pid)
        {
            if (currentId is int cid && pid == cid)
                return BadRequest(new { message = "A group cannot be its own parent." });

            var parent = await _db.GlAccountGroups.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == pid && x.CompanyId == companyId, ct);
            if (parent is null)
                return BadRequest(new { message = "Selected parent group was not found." });

            if (!await _recordRules.SatisfiesReadAsync(parent, user, "accounting", "glAccountGroups", ct))
                return BadRequest(new { message = "You do not have access to the selected parent group." });

            if (entity.FromCode < parent.FromCode || entity.ToCode > parent.ToCode)
            {
                return BadRequest(new
                {
                    message = "Range must stay within the selected parent group range.",
                });
            }

            if (currentId is int cId2)
            {
                var all = await _db.GlAccountGroups.AsNoTracking()
                    .Where(x => x.CompanyId == companyId)
                    .ToListAsync(ct);
                var byId = all.ToDictionary(x => x.Id, x => x);
                if (WouldCreateCycle(cId2, pid, byId))
                    return BadRequest(new { message = "Invalid parent selection (would create a cycle)." });
            }
        }

        // Overlap restrictions must be enforced for all groups in the company (not just those visible to the user).
        var siblingQuery = _db.GlAccountGroups.AsNoTracking()
            .Where(x => x.CompanyId == companyId && x.ParentGroupId == entity.ParentGroupId);
        if (currentId is int exId)
            siblingQuery = siblingQuery.Where(x => x.Id != exId);

        var exactDup = await siblingQuery
            .AnyAsync(x => x.FromCode == entity.FromCode && x.ToCode == entity.ToCode, ct);
        if (exactDup)
            return BadRequest(new { message = "Duplicate range: a sibling group already uses the same From/To codes." });

        // Sibling ranges are inclusive. Adjacent ranges that only touch at one endpoint (e.g. 1–5 and 5–10)
        // must NOT be treated as overlapping. Overlap (reject) iff the intersection has span > 0:
        // max(from) < min(to)  ⇔  existing.from < new.to && existing.to > new.from
        var overlaps = await siblingQuery.AnyAsync(
            x => x.FromCode < entity.ToCode && x.ToCode > entity.FromCode,
            ct);
        if (overlaps)
            return BadRequest(new { message = "Range overlaps with another group under the same parent." });

        return null;
    }

    private static ParsedWriteBody? ParseWriteBody(JsonElement body, out string? error)
    {
        error = null;

        if (!TryGetRequiredString(body, "groupName", out var groupName, out error))
            return null;
        if (!TryGetRequiredInt64(body, "fromCode", out var fromCode, out error))
            return null;
        if (!TryGetRequiredInt64(body, "toCode", out var toCode, out error))
            return null;
        if (!TryGetRequiredString(body, "colorHex", out var colorHex, out error))
            return null;

        int? parentId = null;
        if (body.TryGetProperty("parentGroupId", out var pidEl))
        {
            if (pidEl.ValueKind == JsonValueKind.Number && pidEl.TryGetInt32(out var i))
                parentId = i;
            else if (pidEl.ValueKind == JsonValueKind.Null)
                parentId = null;
        }

        return new ParsedWriteBody(
            groupName.Trim(),
            fromCode,
            toCode,
            parentId,
            colorHex.Trim());
    }

    private static ParsedPartialWriteBody? ParsePartialWriteBody(JsonElement body, out string? error)
    {
        error = null;
        string? groupName = null;
        long? fromCode = null;
        long? toCode = null;
        string? colorHex = null;

        if (body.TryGetProperty("groupName", out var nameEl))
        {
            if (nameEl.ValueKind != JsonValueKind.String)
            {
                error = "Group name must be a text value.";
                return null;
            }
            groupName = (nameEl.GetString() ?? "").Trim();
        }

        if (body.TryGetProperty("fromCode", out var fromEl))
        {
            if (fromEl.ValueKind != JsonValueKind.Number || !fromEl.TryGetInt64(out var v))
            {
                error = "From code must be a number.";
                return null;
            }
            fromCode = v;
        }

        if (body.TryGetProperty("toCode", out var toEl))
        {
            if (toEl.ValueKind != JsonValueKind.Number || !toEl.TryGetInt64(out var v))
            {
                error = "To code must be a number.";
                return null;
            }
            toCode = v;
        }

        var parentSpecified = false;
        int? parentId = null;
        if (body.TryGetProperty("parentGroupId", out var pidEl))
        {
            parentSpecified = true;
            if (pidEl.ValueKind == JsonValueKind.Number && pidEl.TryGetInt32(out var i))
                parentId = i;
            else if (pidEl.ValueKind == JsonValueKind.Null)
                parentId = null;
            else
            {
                error = "Parent group must be a number.";
                return null;
            }
        }

        if (body.TryGetProperty("colorHex", out var colEl))
        {
            if (colEl.ValueKind != JsonValueKind.String)
            {
                error = "Color must be a text value.";
                return null;
            }
            colorHex = (colEl.GetString() ?? "").Trim();
        }

        return new ParsedPartialWriteBody(groupName, fromCode, toCode, parentSpecified, parentId, colorHex);
    }

    private static bool TryGetRequiredString(JsonElement body, string prop, out string value, out string? error)
    {
        value = "";
        error = null;
        if (!body.TryGetProperty(prop, out var el) || el.ValueKind != JsonValueKind.String)
        {
            error = $"{ToHuman(prop)} is required.";
            return false;
        }
        value = (el.GetString() ?? "").Trim();
        if (string.IsNullOrEmpty(value))
        {
            error = $"{ToHuman(prop)} is required.";
            return false;
        }
        return true;
    }

    private static bool TryGetRequiredInt64(JsonElement body, string prop, out long value, out string? error)
    {
        value = 0;
        error = null;
        if (!body.TryGetProperty(prop, out var el) || el.ValueKind != JsonValueKind.Number || !el.TryGetInt64(out value))
        {
            error = $"{ToHuman(prop)} is required.";
            return false;
        }
        return true;
    }

    private static string ToHuman(string prop) =>
        prop switch
        {
            "groupName" => "Group name",
            "fromCode" => "From code",
            "toCode" => "To code",
            "colorHex" => "Color",
            _ => prop,
        };

    private static IQueryable<GlAccountGroup> ApplySort(IQueryable<GlAccountGroup> query, string? sort)
    {
        if (string.IsNullOrWhiteSpace(sort))
            return query.OrderBy(x => x.FromCode).ThenBy(x => x.GroupName).ThenBy(x => x.Id);

        try
        {
            var arr = JsonSerializer.Deserialize<string[]>(sort);
            if (arr is not { Length: >= 2 })
                return query.OrderBy(x => x.FromCode).ThenBy(x => x.GroupName).ThenBy(x => x.Id);

            var field = (arr[0] ?? "").Trim();
            var desc = string.Equals(arr[1], "DESC", StringComparison.OrdinalIgnoreCase);

            if (field.Equals("groupName", StringComparison.OrdinalIgnoreCase))
            {
                return desc
                    ? query.OrderByDescending(x => x.GroupName).ThenByDescending(x => x.Id)
                    : query.OrderBy(x => x.GroupName).ThenBy(x => x.Id);
            }
            if (field.Equals("fromCode", StringComparison.OrdinalIgnoreCase))
            {
                return desc
                    ? query.OrderByDescending(x => x.FromCode).ThenByDescending(x => x.Id)
                    : query.OrderBy(x => x.FromCode).ThenBy(x => x.Id);
            }
            if (field.Equals("toCode", StringComparison.OrdinalIgnoreCase))
            {
                return desc
                    ? query.OrderByDescending(x => x.ToCode).ThenByDescending(x => x.Id)
                    : query.OrderBy(x => x.ToCode).ThenBy(x => x.Id);
            }
        }
        catch (JsonException)
        {
            // ignore
        }

        return query.OrderBy(x => x.FromCode).ThenBy(x => x.GroupName).ThenBy(x => x.Id);
    }

    private async Task<User?> GetCurrentUserAsync(CancellationToken ct)
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        return await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
    }

    private int GetCompanyIdOrThrow()
    {
        var raw = User.FindFirstValue("companyId");
        if (!int.TryParse(raw, out var companyId))
            throw new UnauthorizedAccessException("Missing companyId claim.");
        return companyId;
    }

    private static HashSet<int> CollectDescendantIds(int id, IReadOnlyDictionary<int, GlAccountGroup> byId)
    {
        var childrenByParent = new Dictionary<int, List<int>>();
        foreach (var g in byId.Values)
        {
            if (g.ParentGroupId is int pid)
            {
                if (!childrenByParent.TryGetValue(pid, out var list))
                {
                    list = [];
                    childrenByParent[pid] = list;
                }
                list.Add(g.Id);
            }
        }

        var result = new HashSet<int>();
        var stack = new Stack<int>();
        stack.Push(id);
        while (stack.Count > 0)
        {
            var cur = stack.Pop();
            if (!childrenByParent.TryGetValue(cur, out var kids)) continue;
            foreach (var k in kids)
            {
                if (result.Add(k))
                    stack.Push(k);
            }
        }
        return result;
    }

    private static bool WouldCreateCycle(int currentId, int newParentId, IReadOnlyDictionary<int, GlAccountGroup> byId)
    {
        var seen = new HashSet<int>();
        var cur = newParentId;
        while (true)
        {
            if (!seen.Add(cur))
                return true;
            if (cur == currentId)
                return true;
            if (!byId.TryGetValue(cur, out var g) || g.ParentGroupId is not int next)
                return false;
            cur = next;
        }
    }

    private sealed record ParsedWriteBody(string GroupName, long FromCode, long ToCode, int? ParentGroupId, string ColorHex);
    private sealed record ParsedPartialWriteBody(
        string? GroupName,
        long? FromCode,
        long? ToCode,
        bool ParentGroupIdSpecified,
        int? ParentGroupId,
        string? ColorHex);

    public class GlAccountGroupListDto
    {
        public int id { get; set; }
        public string groupName { get; set; } = "";
        public long fromCode { get; set; }
        public long toCode { get; set; }
        public int? parentGroupId { get; set; }
        public string colorHex { get; set; } = "#000000";
        public DateTime createdAtUtc { get; set; }
        public DateTime updatedAtUtc { get; set; }
    }

    public sealed class GlAccountGroupDetailDto : GlAccountGroupListDto { }

    public sealed class GlAccountGroupTreeNodeDto
    {
        public int id { get; set; }
        public string groupName { get; set; } = "";
        public long fromCode { get; set; }
        public long toCode { get; set; }
        public int? parentGroupId { get; set; }
        public string colorHex { get; set; } = "#000000";
        public List<GlAccountGroupTreeNodeDto> children { get; set; } = [];
    }

    public sealed class GlAccountGroupParentOptionDto
    {
        public int id { get; set; }
        public string groupName { get; set; } = "";
        public long fromCode { get; set; }
        public long toCode { get; set; }
        public int? parentGroupId { get; set; }
        public int depth { get; set; }
        public string colorHex { get; set; } = "#000000";
    }

    public sealed class GlAccountGroupResolvedDto
    {
        public int id { get; set; }
        public string groupName { get; set; } = "";
        public long fromCode { get; set; }
        public long toCode { get; set; }
        public int? parentGroupId { get; set; }
        public string colorHex { get; set; } = "#000000";
    }

    public sealed class GlChartAccountRowDto
    {
        public int id { get; set; }
        public string? glCode { get; set; }
        public string? glTitle { get; set; }
        public int? glType { get; set; }
        public byte? glNature { get; set; }
    }
}

