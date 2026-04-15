using System.Security.Claims;
using System.Text.Json;
using FbrSmartApp.Api.Auth;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/genCashInformation")]
[Authorize]
public sealed class GenCashInformationController : ControllerBase
{
    private readonly AppDbContext _db;

    public GenCashInformationController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [HasPermission("accounting.genCashInformation.read")]
    public async Task<IActionResult> GetList([FromQuery] string? range, [FromQuery] string? filter, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var query = _db.GenCashInformations.AsNoTracking().Where(x => x.CompanyId == companyId);

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
                        var t = q.Trim();
                        query = query.Where(x =>
                            x.AccountTitle != null && x.AccountTitle.Contains(t));
                    }
                }
            }
            catch (JsonException)
            {
                /* ignore */
            }
        }

        query = query.OrderBy(x => x.AccountTitle ?? "").ThenBy(x => x.Id);
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
                /* defaults */
            }
        }

        var take = Math.Min(to - from + 1, 1000);
        var rows = await query.Skip(from).Take(take).ToListAsync(ct);
        var dtos = rows.Select(x => ToDto(x, Array.Empty<Guid>())).ToList();

        Response.Headers.ContentRange =
            $"genCashInformation {from}-{from + Math.Max(dtos.Count - 1, 0)}/{total}";
        Response.Headers.AccessControlExposeHeaders = "Content-Range";
        return Ok(dtos);
    }

    [HttpGet("{id:int}")]
    [HasPermission("accounting.genCashInformation.read")]
    public async Task<IActionResult> GetOne(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var x = await _db.GenCashInformations.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id && b.CompanyId == companyId, ct);
        if (x is null) return NotFound();
        var userIds = await _db.GenCashInformationUsers.AsNoTracking()
            .Where(u => u.CashInfoId == id)
            .Select(u => u.UserId)
            .ToListAsync(ct);
        return Ok(ToDto(x, userIds));
    }

    [HttpPost]
    [HasPermission("accounting.genCashInformation.create")]
    public async Task<IActionResult> Create([FromBody] GenCashInformationWriteDto body, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        if (body.cashAccount is null or <= 0)
            return BadRequest(new { message = "Cash account (chart GL id) is required." });

        var glOk = await _db.GlChartOfAccounts.AsNoTracking()
            .AnyAsync(a => a.Id == body.cashAccount && a.CompanyId == companyId, ct);
        if (!glOk)
            return BadRequest(new { message = "Invalid chart account for this company." });

        var now = DateTime.UtcNow;
        var entity = new GenCashInformation
        {
            CompanyId = companyId,
            AccountTitle = string.IsNullOrWhiteSpace(body.accountTitle) ? null : body.accountTitle.Trim(),
            CashAccount = body.cashAccount,
            EntryUserDateTime = now,
        };
        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        _db.GenCashInformations.Add(entity);
        await _db.SaveChangesAsync(ct);

        await ReplaceUsersAsync(companyId, entity.Id, body.userIds, ct);
        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return CreatedAtAction(nameof(GetOne), new { id = entity.Id }, await ToDtoAsync(entity.Id, ct));
    }

    [HttpPut("{id:int}")]
    [HasPermission("accounting.genCashInformation.write")]
    public async Task<IActionResult> Update(int id, [FromBody] GenCashInformationWriteDto body, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var entity = await _db.GenCashInformations.FirstOrDefaultAsync(b => b.Id == id && b.CompanyId == companyId, ct);
        if (entity is null) return NotFound();

        if (body.cashAccount is null or <= 0)
            return BadRequest(new { message = "Cash account (chart GL id) is required." });
        var glOk = await _db.GlChartOfAccounts.AsNoTracking()
            .AnyAsync(a => a.Id == body.cashAccount && a.CompanyId == companyId, ct);
        if (!glOk)
            return BadRequest(new { message = "Invalid chart account for this company." });

        entity.AccountTitle = string.IsNullOrWhiteSpace(body.accountTitle) ? null : body.accountTitle.Trim();
        entity.CashAccount = body.cashAccount;
        entity.ModifyUserDateTime = DateTime.UtcNow;

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        await ReplaceUsersAsync(companyId, id, body.userIds, ct);
        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await GetOne(id, ct);
    }

    [HttpDelete("{id:int}")]
    [HasPermission("accounting.genCashInformation.delete")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var entity = await _db.GenCashInformations.FirstOrDefaultAsync(b => b.Id == id && b.CompanyId == companyId, ct);
        if (entity is null) return NotFound();
        _db.GenCashInformations.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static object ToDto(GenCashInformation x, IReadOnlyList<Guid> userIds) => new
    {
        id = x.Id,
        companyId = x.CompanyId,
        accountTitle = x.AccountTitle,
        cashAccount = x.CashAccount,
        entryUserId = x.EntryUserId,
        entryUserDateTime = x.EntryUserDateTime,
        modifyUserId = x.ModifyUserId,
        modifyUserDateTime = x.ModifyUserDateTime,
        userIds = userIds.Select(u => u.ToString()).ToList(),
    };

    private async Task<object> ToDtoAsync(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var x = await _db.GenCashInformations.AsNoTracking()
            .FirstAsync(b => b.Id == id && b.CompanyId == companyId, ct);
        var userIds = await _db.GenCashInformationUsers.AsNoTracking()
            .Where(u => u.CashInfoId == id)
            .Select(u => u.UserId)
            .ToListAsync(ct);
        return ToDto(x, userIds);
    }

    private async Task ReplaceUsersAsync(int companyId, int cashInfoId, List<string>? userIds, CancellationToken ct)
    {
        var parsed = new HashSet<Guid>();
        foreach (var s in userIds ?? [])
        {
            if (Guid.TryParse(s, out var g))
                parsed.Add(g);
        }

        // Only keep users in this company (defense in depth).
        if (parsed.Count > 0)
        {
            var ok = await _db.Users.AsNoTracking()
                .Where(u => parsed.Contains(u.Id) && u.CompanyId == companyId)
                .Select(u => u.Id)
                .ToListAsync(ct);
            parsed = ok.ToHashSet();
        }

        var existing = await _db.GenCashInformationUsers
            .Where(x => x.CashInfoId == cashInfoId)
            .ToListAsync(ct);

        var keep = parsed;
        foreach (var row in existing)
        {
            if (!keep.Contains(row.UserId))
                _db.GenCashInformationUsers.Remove(row);
        }
        foreach (var uid in keep)
        {
            if (existing.Any(x => x.UserId == uid)) continue;
            _db.GenCashInformationUsers.Add(new GenCashInformationUser
            {
                CashInfoId = cashInfoId,
                UserId = uid,
            });
        }
    }

    private int GetCompanyIdOrThrow()
    {
        var raw = User.FindFirst("companyId")?.Value;
        if (!int.TryParse(raw, out var companyId))
            throw new UnauthorizedAccessException("Missing companyId claim.");
        return companyId;
    }
}

public sealed class GenCashInformationWriteDto
{
    public int? cashAccount { get; set; }
    public string? accountTitle { get; set; }
    public List<string>? userIds { get; set; }
}
