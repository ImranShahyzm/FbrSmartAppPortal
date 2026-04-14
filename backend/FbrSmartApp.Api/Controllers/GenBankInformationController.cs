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
[Route("api/genBankInformation")]
[Authorize]
public sealed class GenBankInformationController : ControllerBase
{
    private readonly AppDbContext _db;

    public GenBankInformationController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [HasPermission("accounting.genBankInformation.read")]
    public async Task<IActionResult> GetList([FromQuery] string? range, [FromQuery] string? filter, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var query = _db.GenBankInformations.AsNoTracking().Where(x => x.CompanyId == companyId);

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
                            (x.BankAccountTitle != null && x.BankAccountTitle.Contains(t)) ||
                            (x.BankName != null && x.BankName.Contains(t)) ||
                            (x.BankAccountNumber != null && x.BankAccountNumber.Contains(t)) ||
                            (x.BankBranchCode != null && x.BankBranchCode.Contains(t)) ||
                            (x.BankAddress != null && x.BankAddress.Contains(t)));
                    }
                }
            }
            catch (JsonException)
            {
                /* ignore */
            }
        }

        query = query.OrderBy(x => x.BankAccountTitle ?? "").ThenBy(x => x.Id);
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
        var dtos = rows.Select(ToDto).ToList();

        Response.Headers.ContentRange =
            $"genBankInformation {from}-{from + Math.Max(dtos.Count - 1, 0)}/{total}";
        Response.Headers.AccessControlExposeHeaders = "Content-Range";
        return Ok(dtos);
    }

    [HttpGet("{id:int}")]
    [HasPermission("accounting.genBankInformation.read")]
    public async Task<IActionResult> GetOne(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var x = await _db.GenBankInformations.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id && b.CompanyId == companyId, ct);
        if (x is null) return NotFound();
        return Ok(ToDto(x));
    }

    [HttpPost]
    [HasPermission("accounting.genBankInformation.create")]
    public async Task<IActionResult> Create([FromBody] GenBankInformationWriteDto body, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        if (body.glcaId is null or <= 0)
            return BadRequest(new { message = "Chart account (GLCAID) is required." });

        var glOk = await _db.GlChartOfAccounts.AsNoTracking()
            .AnyAsync(a => a.Id == body.glcaId && a.CompanyId == companyId, ct);
        if (!glOk)
            return BadRequest(new { message = "Invalid chart account for this company." });

        var now = DateTime.UtcNow;
        var entity = new GenBankInformation
        {
            CompanyId = companyId,
            BankAccountTitle = string.IsNullOrWhiteSpace(body.bankAccountTitle) ? null : body.bankAccountTitle.Trim(),
            GlcaId = body.glcaId,
            BankAccountNumber = string.IsNullOrWhiteSpace(body.bankAccountNumber) ? null : body.bankAccountNumber.Trim(),
            BankName = string.IsNullOrWhiteSpace(body.bankName) ? null : body.bankName.Trim(),
            BankBranchCode = string.IsNullOrWhiteSpace(body.bankBranchCode) ? null : body.bankBranchCode.Trim(),
            BankAddress = string.IsNullOrWhiteSpace(body.bankAddress) ? null : body.bankAddress.Trim(),
            EntryUserDateTime = now,
        };
        _db.GenBankInformations.Add(entity);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetOne), new { id = entity.Id }, ToDto(entity));
    }

    [HttpPut("{id:int}")]
    [HasPermission("accounting.genBankInformation.write")]
    public async Task<IActionResult> Update(int id, [FromBody] GenBankInformationWriteDto body, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var entity = await _db.GenBankInformations.FirstOrDefaultAsync(b => b.Id == id && b.CompanyId == companyId, ct);
        if (entity is null) return NotFound();

        entity.BankAccountTitle = string.IsNullOrWhiteSpace(body.bankAccountTitle) ? null : body.bankAccountTitle.Trim();
        entity.BankAccountNumber = string.IsNullOrWhiteSpace(body.bankAccountNumber) ? null : body.bankAccountNumber.Trim();
        entity.BankName = string.IsNullOrWhiteSpace(body.bankName) ? null : body.bankName.Trim();
        entity.BankBranchCode = string.IsNullOrWhiteSpace(body.bankBranchCode) ? null : body.bankBranchCode.Trim();
        entity.BankAddress = string.IsNullOrWhiteSpace(body.bankAddress) ? null : body.bankAddress.Trim();
        entity.ModifyUserDateTime = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return await GetOne(id, ct);
    }

    [HttpDelete("{id:int}")]
    [HasPermission("accounting.genBankInformation.delete")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var entity = await _db.GenBankInformations.FirstOrDefaultAsync(b => b.Id == id && b.CompanyId == companyId, ct);
        if (entity is null) return NotFound();
        _db.GenBankInformations.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static object ToDto(GenBankInformation x) => new
    {
        id = x.Id,
        companyId = x.CompanyId,
        bankAccountTitle = x.BankAccountTitle,
        bankAccountNumber = x.BankAccountNumber,
        bankName = x.BankName,
        bankBranchCode = x.BankBranchCode,
        bankAddress = x.BankAddress,
        entryUserId = x.EntryUserId,
        entryUserDateTime = x.EntryUserDateTime,
        modifyUserId = x.ModifyUserId,
        modifyUserDateTime = x.ModifyUserDateTime,
    };

    private int GetCompanyIdOrThrow()
    {
        var raw = User.FindFirst("companyId")?.Value;
        if (!int.TryParse(raw, out var companyId))
            throw new UnauthorizedAccessException("Missing companyId claim.");
        return companyId;
    }
}

public sealed class GenBankInformationWriteDto
{
    public int? glcaId { get; set; }
    public string? bankAccountTitle { get; set; }
    public string? bankAccountNumber { get; set; }
    public string? bankName { get; set; }
    public string? bankBranchCode { get; set; }
    public string? bankAddress { get; set; }
}
