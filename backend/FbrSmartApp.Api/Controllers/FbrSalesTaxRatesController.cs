using System.Globalization;
using System.Security.Claims;
using System.Text.Json;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/fbrSalesTaxRates")]
[Authorize]
public sealed class FbrSalesTaxRatesController : ControllerBase
{
    private readonly AppDbContext _db;

    public FbrSalesTaxRatesController(AppDbContext db) => _db = db;

    /// <summary>List tax rates. Pass asOf=yyyy-MM-dd (invoice date) to return only rows effective on that date.</summary>
    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? sort,
        [FromQuery] string? range,
        [FromQuery] string? filter,
        [FromQuery] string? asOf,
        CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var query = _db.FbrSalesTaxRates.AsNoTracking().Where(x => x.CompanyId == companyId);

        if (!string.IsNullOrWhiteSpace(asOf) && DateOnly.TryParse(asOf, out var asOfDate))
        {
            query = query.Where(x =>
                x.EffectiveFrom <= asOfDate &&
                (x.EffectiveTo == null || x.EffectiveTo >= asOfDate));
        }

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
                        var qq = q.Trim();
                        query = query.Where(x => x.Label.Contains(qq));
                    }
                }
            }
            catch (JsonException)
            {
                // ignore
            }
        }

        query = query.OrderBy(x => x.Label).ThenBy(x => x.EffectiveFrom);
        var total = await query.CountAsync(ct);
        var items = await query.Take(1000).ToListAsync(ct);

        Response.Headers["Content-Range"] =
            $"fbrSalesTaxRates 0-{Math.Max(items.Count - 1, 0)}/{total}";
        return Ok(items);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<FbrSalesTaxRateDetailDto>> GetOne(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var item = await _db.FbrSalesTaxRates.AsNoTracking()
            .Include(x => x.ChatterMessages)
            .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (item is null) return NotFound();
        return Ok(await MapDetailAsync(item, ct));
    }

    /// <summary>Append chatter message + optional file payloads (base64).</summary>
    [HttpPost("{id:int}/chatter")]
    public async Task<ActionResult<ChatterMessageDto>> PostChatter(
        int id,
        [FromBody] PostChatterRequest req,
        CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var rate = await _db.FbrSalesTaxRates.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (rate is null) return NotFound();

        var author = User.FindFirstValue("fullName") ?? User.Identity?.Name ?? "User";
        string? attachmentsJson = null;
        if (req.Attachments is { Count: > 0 })
        {
            var list = new List<object>();
            foreach (var a in req.Attachments)
            {
                if (string.IsNullOrWhiteSpace(a.DataBase64)) continue;
                var raw = a.DataBase64;
                if (raw.Length > 600_000) continue;
                list.Add(new { name = a.Name ?? "file", mime = a.Mime ?? "application/octet-stream", dataBase64 = raw });
            }

            attachmentsJson = JsonSerializer.Serialize(list);
        }

        var msg = new FbrSalesTaxRateChatterMessage
        {
            Id = Guid.NewGuid(),
            SalesTaxRateId = id,
            Body = req.Body?.Trim() ?? "",
            CreatedAtUtc = DateTime.UtcNow,
            AuthorDisplayName = author,
            AttachmentsJson = attachmentsJson,
        };
        _db.FbrSalesTaxRateChatterMessages.Add(msg);
        await _db.SaveChangesAsync(ct);

        return Ok(MapChatter(msg));
    }

    [HttpPost]
    public async Task<ActionResult<FbrSalesTaxRateDetailDto>> Create([FromBody] UpsertFbrSalesTaxRateRequest req, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var label = (req.Label ?? "").Trim();
        if (string.IsNullOrEmpty(label))
            return BadRequest(new { message = "Label is required." });

        if (!DateOnly.TryParse(req.EffectiveFrom, out var effFrom))
            return BadRequest(new { message = "EffectiveFrom must be a valid date (yyyy-MM-dd)." });

        DateOnly? effTo = null;
        if (!string.IsNullOrWhiteSpace(req.EffectiveTo) && DateOnly.TryParse(req.EffectiveTo, out var et))
            effTo = et;

        if (effTo is { } t && t < effFrom)
            return BadRequest(new { message = "EffectiveTo must be on or after EffectiveFrom." });

        if (await _db.FbrSalesTaxRates.AnyAsync(
                x => x.CompanyId == companyId && x.Label == label && x.EffectiveFrom == effFrom, ct))
            return Conflict(new { message = "A row with this Label and EffectiveFrom already exists." });

        var entity = new FbrSalesTaxRate
        {
            CompanyId = companyId,
            Label = label,
            Percentage = req.Percentage,
            EffectiveFrom = effFrom,
            EffectiveTo = effTo,
        };
        ApplyExtendedFields(entity, req);
        _db.FbrSalesTaxRates.Add(entity);
        await _db.SaveChangesAsync(ct);
        var created = await _db.FbrSalesTaxRates.AsNoTracking()
            .Include(x => x.ChatterMessages)
            .FirstAsync(x => x.Id == entity.Id, ct);
        return Ok(await MapDetailAsync(created, ct));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<FbrSalesTaxRateDetailDto>> Update(int id, [FromBody] UpsertFbrSalesTaxRateRequest req, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var existing = await _db.FbrSalesTaxRates.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (existing is null) return NotFound();

        var label = (req.Label ?? existing.Label).Trim();
        if (string.IsNullOrEmpty(label))
            return BadRequest(new { message = "Label is required." });

        if (!DateOnly.TryParse(req.EffectiveFrom, out var effFrom))
            return BadRequest(new { message = "EffectiveFrom must be a valid date (yyyy-MM-dd)." });

        DateOnly? effTo = null;
        if (!string.IsNullOrWhiteSpace(req.EffectiveTo) && DateOnly.TryParse(req.EffectiveTo, out var et))
            effTo = et;

        if (effTo is { } t && t < effFrom)
            return BadRequest(new { message = "EffectiveTo must be on or after EffectiveFrom." });

        if (await _db.FbrSalesTaxRates.AnyAsync(
                x => x.CompanyId == companyId && x.Label == label && x.EffectiveFrom == effFrom && x.Id != id, ct))
            return Conflict(new { message = "A row with this Label and EffectiveFrom already exists." });

        existing.Label = label;
        existing.Percentage = req.Percentage;
        existing.EffectiveFrom = effFrom;
        existing.EffectiveTo = effTo;
        ApplyExtendedFields(existing, req);
        await _db.SaveChangesAsync(ct);
        var reloaded = await _db.FbrSalesTaxRates.AsNoTracking()
            .Include(x => x.ChatterMessages)
            .FirstAsync(x => x.Id == id, ct);
        return Ok(await MapDetailAsync(reloaded, ct));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var existing = await _db.FbrSalesTaxRates.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (existing is null) return NotFound();

        var inUse = await _db.FbrInvoiceLines.AnyAsync(x => x.FbrSalesTaxRateId == id, ct);
        if (inUse)
            return Conflict(new { message = "Tax rate is in use by invoice lines." });

        _db.FbrSalesTaxRates.Remove(existing);
        await _db.SaveChangesAsync(ct);
        return Ok(new { id });
    }

    private int GetCompanyIdOrThrow()
    {
        var raw = User.FindFirstValue("companyId");
        if (!int.TryParse(raw, out var companyId))
            throw new UnauthorizedAccessException("Missing companyId claim.");
        return companyId;
    }

    private static void ApplyExtendedFields(FbrSalesTaxRate e, UpsertFbrSalesTaxRateRequest req)
    {
        e.TaxComputation = NormalizeTaxComputation(req.TaxComputation);
        e.IsActive = req.Active;
        e.TaxType = NormalizeTaxType(req.TaxType);
        e.TaxScope = string.IsNullOrWhiteSpace(req.TaxScope) ? null : Truncate(req.TaxScope.Trim(), 20);
        e.LabelOnInvoices = TruncateNullable(req.LabelOnInvoices, 200);
        e.Description = TruncateNullable(req.Description, 500);
        e.TaxGroup = TruncateNullable(req.TaxGroup, 200);
        e.IncludeInAnalyticCost = req.IncludeInAnalyticCost;
        e.Country = TruncateNullable(req.Country, 120);
        e.LegalNotes = TruncateNullable(req.LegalNotes, 2000);
        e.IncludedInPrice = string.IsNullOrWhiteSpace(req.IncludedInPrice)
            ? null
            : Truncate(NormalizeIncludedInPrice(req.IncludedInPrice), 50);
        e.AffectBaseOfSubsequentTaxes = req.AffectBaseOfSubsequentTaxes;
    }

    private static string NormalizeTaxComputation(string? raw)
    {
        var t = (raw ?? "percentage").Trim().ToLowerInvariant();
        return t switch
        {
            "group_of_taxes" => "group_of_taxes",
            "fixed" => "fixed",
            "percentage" => "percentage",
            "percentage_tax_included" => "percentage_tax_included",
            _ => "percentage",
        };
    }

    private static string NormalizeTaxType(string? raw)
    {
        var t = (raw ?? "sales").Trim().ToLowerInvariant();
        return t switch
        {
            "sales" => "sales",
            "purchase" => "purchase",
            "purchases" => "purchase",
            "none" => "none",
            _ => "sales",
        };
    }

    private static string NormalizeIncludedInPrice(string raw)
    {
        var t = raw.Trim().ToLowerInvariant();
        return t switch
        {
            "yes" => "yes",
            "no" => "no",
            "default" => "default",
            _ => "default",
        };
    }

    private static string? TruncateNullable(string? value, int maxLen)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var t = value.Trim();
        return t.Length <= maxLen ? t : t[..maxLen];
    }

    private static string Truncate(string value, int maxLen) =>
        value.Length <= maxLen ? value : value[..maxLen];

    private async Task<FbrSalesTaxRateDetailDto> MapDetailAsync(FbrSalesTaxRate row, CancellationToken ct)
    {
        var chatter = (row.ChatterMessages ?? Array.Empty<FbrSalesTaxRateChatterMessage>())
            .OrderBy(m => m.CreatedAtUtc)
            .Select(MapChatter)
            .ToList();

        var companyName = await _db.Companies.AsNoTracking()
            .Where(c => c.Id == row.CompanyId)
            .Select(c => c.Title)
            .FirstOrDefaultAsync(ct) ?? "";

        return new FbrSalesTaxRateDetailDto
        {
            Id = row.Id,
            CompanyId = row.CompanyId,
            CompanyName = companyName,
            Label = row.Label,
            Percentage = row.Percentage,
            EffectiveFrom = row.EffectiveFrom.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            EffectiveTo = row.EffectiveTo?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            Active = row.IsActive,
            TaxComputation = row.TaxComputation,
            TaxType = row.TaxType,
            TaxScope = row.TaxScope,
            LabelOnInvoices = row.LabelOnInvoices,
            Description = row.Description,
            TaxGroup = row.TaxGroup,
            IncludeInAnalyticCost = row.IncludeInAnalyticCost,
            Country = row.Country,
            LegalNotes = row.LegalNotes,
            IncludedInPrice = row.IncludedInPrice,
            AffectBaseOfSubsequentTaxes = row.AffectBaseOfSubsequentTaxes,
            ChatterMessages = chatter,
        };
    }

    private static ChatterMessageDto MapChatter(FbrSalesTaxRateChatterMessage m)
    {
        List<ChatterAttachmentDto>? attachments = null;
        if (!string.IsNullOrWhiteSpace(m.AttachmentsJson))
        {
            try
            {
                attachments = JsonSerializer.Deserialize<List<ChatterAttachmentDto>>(
                    m.AttachmentsJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (JsonException)
            {
                attachments = null;
            }
        }

        return new ChatterMessageDto
        {
            Id = m.Id,
            Body = m.Body,
            CreatedAt = m.CreatedAtUtc.ToString("O"),
            AuthorDisplayName = m.AuthorDisplayName,
            Attachments = attachments,
        };
    }

    public sealed class FbrSalesTaxRateDetailDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public string CompanyName { get; set; } = "";
        public string Label { get; set; } = "";
        public decimal Percentage { get; set; }
        public string EffectiveFrom { get; set; } = "";
        public string? EffectiveTo { get; set; }
        public bool Active { get; set; }
        public string TaxComputation { get; set; } = "percentage";
        public string TaxType { get; set; } = "sales";
        public string? TaxScope { get; set; }
        public string? LabelOnInvoices { get; set; }
        public string? Description { get; set; }
        public string? TaxGroup { get; set; }
        public bool IncludeInAnalyticCost { get; set; }
        public string? Country { get; set; }
        public string? LegalNotes { get; set; }
        public string? IncludedInPrice { get; set; }
        public bool AffectBaseOfSubsequentTaxes { get; set; }
        public List<ChatterMessageDto> ChatterMessages { get; set; } = new();
    }

    public sealed class ChatterMessageDto
    {
        public Guid Id { get; set; }
        public string Body { get; set; } = "";
        public string CreatedAt { get; set; } = "";
        public string? AuthorDisplayName { get; set; }
        public List<ChatterAttachmentDto>? Attachments { get; set; }
    }

    public sealed class ChatterAttachmentDto
    {
        public string? Name { get; set; }
        public string? Mime { get; set; }
        public string? DataBase64 { get; set; }
    }

    public sealed class PostChatterRequest
    {
        public string? Body { get; set; }
        public List<PostChatterAttachment>? Attachments { get; set; }
    }

    public sealed class PostChatterAttachment
    {
        public string? Name { get; set; }
        public string? Mime { get; set; }
        public string? DataBase64 { get; set; }
    }

    public sealed class UpsertFbrSalesTaxRateRequest
    {
        public string? Label { get; set; }
        public decimal Percentage { get; set; }
        public string? EffectiveFrom { get; set; }
        public string? EffectiveTo { get; set; }
        public bool Active { get; set; } = true;
        public string? TaxComputation { get; set; }
        public string? TaxType { get; set; }
        public string? TaxScope { get; set; }
        public string? LabelOnInvoices { get; set; }
        public string? Description { get; set; }
        public string? TaxGroup { get; set; }
        public bool IncludeInAnalyticCost { get; set; }
        public string? Country { get; set; }
        public string? LegalNotes { get; set; }
        public string? IncludedInPrice { get; set; }
        public bool AffectBaseOfSubsequentTaxes { get; set; }
    }
}
