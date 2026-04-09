using System.Security.Claims;
using System.Text.Json;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Services.Fbr;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/fbrPdi")]
[Authorize]
public sealed class FbrPdiController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IFbrPdiClient _pdi;
    private readonly IFbrPdiSyncService _sync;

    public FbrPdiController(AppDbContext db, IFbrPdiClient pdi, IFbrPdiSyncService sync)
    {
        _db = db;
        _pdi = pdi;
        _sync = sync;
    }

    [HttpGet("uoms")]
    public async Task<IActionResult> GetUoms(
        [FromQuery] string? q,
        [FromQuery] int take = 10,
        CancellationToken ct = default)
    {
        var companyId = GetCompanyIdOrThrow();
        take = Math.Clamp(take, 1, 200);
        var query = _db.FbrPdiUoms.AsNoTracking().Where(x => x.CompanyId == companyId);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var qq = q.Trim();
            query = query.Where(x => x.Description.Contains(qq) || x.UomId.ToString().Contains(qq));
        }

        var items = await query
            .OrderBy(x => x.Description)
            .Take(take)
            .Select(x => new { id = x.UomId, uomId = x.UomId, description = x.Description })
            .ToListAsync(ct);

        Response.Headers["Content-Range"] = $"fbrPdiUoms 0-{Math.Max(items.Count - 1, 0)}/{items.Count}";
        return Ok(items);
    }

    [HttpGet("item-desc-codes")]
    public async Task<IActionResult> GetItemDescCodes(
        [FromQuery] string? q,
        [FromQuery] int take = 50,
        CancellationToken ct = default)
    {
        var companyId = GetCompanyIdOrThrow();
        take = Math.Clamp(take, 1, 500);
        var query = _db.FbrPdiItemDescCodes.AsNoTracking().Where(x => x.CompanyId == companyId);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var qq = q.Trim();
            query = query.Where(x => x.HsCode.Contains(qq) || x.Description.Contains(qq));
        }

        var items = await query
            .OrderBy(x => x.HsCode)
            .Take(take)
            .Select(x => new { id = x.HsCode, hsCode = x.HsCode, description = x.Description })
            .ToListAsync(ct);

        Response.Headers["Content-Range"] =
            $"fbrPdiItemDescCodes 0-{Math.Max(items.Count - 1, 0)}/{items.Count}";
        return Ok(items);
    }

    [HttpGet("trans-types")]
    public async Task<IActionResult> GetTransTypes(
        [FromQuery] string? q,
        [FromQuery] int take = 50,
        CancellationToken ct = default)
    {
        var companyId = GetCompanyIdOrThrow();
        take = Math.Clamp(take, 1, 500);
        var query = _db.FbrPdiTransTypes.AsNoTracking()
            .Where(x => x.CompanyId == companyId);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var qq = q.Trim();
            query = query.Where(x =>
                x.Description.Contains(qq) || x.TransTypeId.ToString().Contains(qq));
        }

        var items = await query
            .OrderBy(x => x.Description)
            .Take(take)
            .Select(x => new { id = x.TransTypeId, transTypeId = x.TransTypeId, description = x.Description })
            .ToListAsync(ct);

        Response.Headers["Content-Range"] =
            $"fbrPdiTransTypes 0-{Math.Max(items.Count - 1, 0)}/{items.Count}";
        return Ok(items);
    }

    [HttpGet("sale-type-rates")]
    public async Task<IActionResult> GetSaleTypeRates(
        [FromQuery] int transTypeId,
        [FromQuery] string? date,
        [FromQuery] int originationSupplier = 1,
        CancellationToken ct = default)
    {
        var companyId = GetCompanyIdOrThrow();
        DateOnly rateDate;
        if (!string.IsNullOrWhiteSpace(date) && DateOnly.TryParse(date, out var parsed))
            rateDate = parsed;
        else
            rateDate = DateOnly.FromDateTime(DateTime.UtcNow);

        var rows = await _sync.GetOrFetchSaleTypeRatesAsync(
            companyId,
            transTypeId,
            rateDate,
            originationSupplier,
            ct);

        var items = rows
            .Select(x => new
            {
                id = x.RateId,
                rateId = x.RateId,
                rateDesc = x.RateDesc,
                rateValue = x.RateValue,
            })
            .ToList();

        Response.Headers["Content-Range"] =
            $"fbrPdiSaleTypeRates 0-{Math.Max(items.Count - 1, 0)}/{items.Count}";
        return Ok(items);
    }

    [HttpGet("hs-uom")]
    public async Task<IActionResult> GetHsUom(
        [FromQuery] string? hsCode,
        [FromQuery] int annexureId = 3,
        CancellationToken ct = default)
    {
        var companyId = GetCompanyIdOrThrow();
        if (string.IsNullOrWhiteSpace(hsCode))
            return BadRequest(new { message = "hsCode is required." });

        var company = await _db.Companies.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == companyId, ct);
        if (company is null)
            return BadRequest(new { message = "Company not found." });

        var token = company.EnableSandBox
            ? company.FbrTokenSandBox?.Trim()
            : company.FbrTokenProduction?.Trim();
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { message = "FBR token is not configured." });

        var path =
            $"pdi/v2/HS_UOM?hs_code={Uri.EscapeDataString(hsCode.Trim())}&annexure_id={annexureId}";
        string json;
        try
        {
            json = await _pdi.GetAsync(path, token, ct);
        }
        catch (HttpRequestException ex)
        {
            return BadRequest(new { message = ex.Message });
        }

        using var doc = JsonDocument.Parse(json);
        var uomIds = new List<int>();
        foreach (var el in FbrPdiJson.EnumerateItems(doc.RootElement))
        {
            var id = FbrPdiJson.GetIntLoose(el, "uoM_ID", "uomId", "UomId");
            if (id != 0)
                uomIds.Add(id);
        }

        uomIds = uomIds.Distinct().ToList();
        return Ok(new { uomIds });
    }

    private int GetCompanyIdOrThrow()
    {
        var raw = User.FindFirstValue("companyId");
        if (!int.TryParse(raw, out var companyId))
            throw new UnauthorizedAccessException("Missing companyId claim.");
        return companyId;
    }
}
