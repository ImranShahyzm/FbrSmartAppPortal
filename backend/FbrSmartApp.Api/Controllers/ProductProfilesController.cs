using System.Security.Claims;
using System.Text.Json;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/productProfiles")]
[Authorize]
public sealed class ProductProfilesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public ProductProfilesController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? sort,
        [FromQuery] string? range,
        [FromQuery] string? filter,
        CancellationToken ct
    )
    {
        var companyId = GetCompanyIdOrThrow();
        var query = _db.ProductProfiles.AsNoTracking()
            .Where(x => x.CompanyId == companyId);

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
                        query = query.Where(x =>
                            x.ProductNo.Contains(qq) || x.ProductName.Contains(qq));
                    }
                }
            }
            catch (JsonException)
            {
                // ignore
            }
        }

        query = query.OrderByDescending(x => x.CreatedAtUtc);
        var total = await query.CountAsync(ct);

        var items = await query.Take(1000).ToListAsync(ct);

        Response.Headers["Content-Range"] = $"productProfiles 0-{Math.Max(items.Count - 1, 0)}/{total}";
        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProductProfileDetailDto>> GetOne(Guid id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var item = await _db.ProductProfiles.AsNoTracking()
            .Include(x => x.ChatterMessages)
            .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (item is null) return NotFound();
        return Ok(MapDetail(item));
    }

    /// <summary>Append internal note + optional file payloads (base64).</summary>
    [HttpPost("{id:guid}/chatter")]
    public async Task<ActionResult<ChatterMessageDto>> PostChatter(
        Guid id,
        [FromBody] PostChatterRequest req,
        CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var product = await _db.ProductProfiles.FirstOrDefaultAsync(
            x => x.Id == id && x.CompanyId == companyId,
            ct);
        if (product is null) return NotFound();

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
                list.Add(new
                {
                    name = a.Name ?? "file",
                    mime = a.Mime ?? "application/octet-stream",
                    dataBase64 = raw,
                });
            }

            attachmentsJson = JsonSerializer.Serialize(list);
        }

        var msg = new ProductProfileChatterMessage
        {
            Id = Guid.NewGuid(),
            ProductProfileId = id,
            Body = req.Body?.Trim() ?? "",
            CreatedAtUtc = DateTime.UtcNow,
            AuthorDisplayName = author,
            AttachmentsJson = attachmentsJson,
        };
        _db.ProductProfileChatterMessages.Add(msg);
        await _db.SaveChangesAsync(ct);

        return Ok(MapChatter(msg));
    }

    [HttpPost]
    public async Task<ActionResult<ProductProfile>> Create([FromBody] UpsertProductProfileRequest req, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var entity = new ProductProfile
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            ProductNo = req.ProductNo ?? "",
            ProductName = req.ProductName ?? "",
            HsCode = req.HsCode ?? "",
            SaleTypeId = req.SaleTypeId,
            RateId = req.RateId,
            RateValue = req.RateValue,
            PurchasePrice = req.PurchasePrice,
            SroId = req.SroId,
            SroItemId = req.SroItemId,
            FbrProductType = string.IsNullOrWhiteSpace(req.FbrProductType) ? null : req.FbrProductType.Trim(),
            SroScheduleNoText = string.IsNullOrWhiteSpace(req.SroScheduleNoText) ? null : req.SroScheduleNoText.Trim(),
            SroItemRefText = string.IsNullOrWhiteSpace(req.SroItemRefText) ? null : req.SroItemRefText.Trim(),
            FixedNotifiedApplicable = req.FixedNotifiedApplicable,
            MrpRateValue = req.MrpRateValue,
            FbrUomId = req.FbrUomId,
            FbrPdiTransTypeId = req.FbrPdiTransTypeId,
            CreatedAtUtc = DateTime.UtcNow,
        };
        _db.ProductProfiles.Add(entity);
        await _db.SaveChangesAsync(ct);

        if (!string.IsNullOrWhiteSpace(req.ProductImageBase64))
        {
            entity.ProductImage = await SaveProductImageAsync(companyId, entity.Id, req.ProductImageBase64, ct);
            await _db.SaveChangesAsync(ct);
        }

        return Ok(entity);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProductProfile>> Update(Guid id, [FromBody] UpsertProductProfileRequest req, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var existing = await _db.ProductProfiles.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (existing is null) return NotFound();

        existing.ProductNo = req.ProductNo ?? existing.ProductNo;
        existing.ProductName = req.ProductName ?? existing.ProductName;
        existing.HsCode = req.HsCode ?? existing.HsCode;
        existing.SaleTypeId = req.SaleTypeId;
        existing.RateId = req.RateId;
        existing.RateValue = req.RateValue;
        existing.PurchasePrice = req.PurchasePrice;
        existing.SroId = req.SroId;
        existing.SroItemId = req.SroItemId;
        existing.FbrProductType = string.IsNullOrWhiteSpace(req.FbrProductType) ? null : req.FbrProductType.Trim();
        existing.SroScheduleNoText = string.IsNullOrWhiteSpace(req.SroScheduleNoText) ? null : req.SroScheduleNoText.Trim();
        existing.SroItemRefText = string.IsNullOrWhiteSpace(req.SroItemRefText) ? null : req.SroItemRefText.Trim();
        existing.FixedNotifiedApplicable = req.FixedNotifiedApplicable;
        existing.MrpRateValue = req.MrpRateValue;
        existing.FbrUomId = req.FbrUomId;
        existing.FbrPdiTransTypeId = req.FbrPdiTransTypeId;

        if (!string.IsNullOrWhiteSpace(req.ProductImageBase64))
        {
            existing.ProductImage = await SaveProductImageAsync(companyId, existing.Id, req.ProductImageBase64, ct);
        }

        await _db.SaveChangesAsync(ct);
        return Ok(existing);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var existing = await _db.ProductProfiles.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (existing is null) return NotFound();

        _db.ProductProfiles.Remove(existing);
        await _db.SaveChangesAsync(ct);
        return Ok(new { id });
    }

    private static ProductProfileDetailDto MapDetail(ProductProfile p)
    {
        var chatter = (p.ChatterMessages ?? Array.Empty<ProductProfileChatterMessage>())
            .OrderBy(m => m.CreatedAtUtc)
            .Select(MapChatter)
            .ToList();

        return new ProductProfileDetailDto
        {
            Id = p.Id,
            CompanyId = p.CompanyId,
            ProductNo = p.ProductNo,
            ProductName = p.ProductName,
            HsCode = p.HsCode,
            SaleTypeId = p.SaleTypeId,
            RateId = p.RateId,
            RateValue = p.RateValue,
            PurchasePrice = p.PurchasePrice,
            SroId = p.SroId,
            SroItemId = p.SroItemId,
            FbrProductType = p.FbrProductType,
            SroScheduleNoText = p.SroScheduleNoText,
            SroItemRefText = p.SroItemRefText,
            FixedNotifiedApplicable = p.FixedNotifiedApplicable,
            MrpRateValue = p.MrpRateValue,
            FbrUomId = p.FbrUomId,
            FbrPdiTransTypeId = p.FbrPdiTransTypeId,
            ProductImage = p.ProductImage,
            CreatedAtUtc = p.CreatedAtUtc,
            ChatterMessages = chatter,
        };
    }

    private static ChatterMessageDto MapChatter(ProductProfileChatterMessage m)
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

    private int GetCompanyIdOrThrow()
    {
        var raw = User.FindFirstValue("companyId");
        if (!int.TryParse(raw, out var companyId))
        {
            throw new UnauthorizedAccessException("Missing companyId claim.");
        }
        return companyId;
    }

    private async Task<string> SaveProductImageAsync(int companyId, Guid productId, string base64DataUrl, CancellationToken ct)
    {
        var base64 = base64DataUrl;
        var ext = "png";
        var comma = base64DataUrl.IndexOf(',');
        if (base64DataUrl.StartsWith("data:", StringComparison.OrdinalIgnoreCase) && comma >= 0)
        {
            var header = base64DataUrl.Substring(0, comma);
            base64 = base64DataUrl[(comma + 1)..];
            if (header.Contains("image/jpeg", StringComparison.OrdinalIgnoreCase)) ext = "jpg";
            if (header.Contains("image/png", StringComparison.OrdinalIgnoreCase)) ext = "png";
            if (header.Contains("image/webp", StringComparison.OrdinalIgnoreCase)) ext = "webp";
        }

        var bytes = Convert.FromBase64String(base64);
        var dir = Path.Combine(_env.ContentRootPath, "uploads", "productProfiles", companyId.ToString(), productId.ToString("N"));
        Directory.CreateDirectory(dir);

        var fileName = $"image.{ext}";
        var fullPath = Path.Combine(dir, fileName);
        await System.IO.File.WriteAllBytesAsync(fullPath, bytes, ct);

        return Path.Combine("uploads", "productProfiles", companyId.ToString(), productId.ToString("N"), fileName)
            .Replace('\\', '/');
    }

    public sealed class UpsertProductProfileRequest
    {
        public string? ProductNo { get; set; }
        public string? ProductName { get; set; }
        public string? HsCode { get; set; }
        public int? SaleTypeId { get; set; }
        public int? RateId { get; set; }
        public decimal? RateValue { get; set; }
        public decimal? PurchasePrice { get; set; }
        public int? SroId { get; set; }
        public int? SroItemId { get; set; }
        public string? FbrProductType { get; set; }
        public string? SroScheduleNoText { get; set; }
        public string? SroItemRefText { get; set; }
        public bool FixedNotifiedApplicable { get; set; }
        public decimal? MrpRateValue { get; set; }
        public int? FbrUomId { get; set; }
        public int? FbrPdiTransTypeId { get; set; }
        public string? ProductImageBase64 { get; set; }
    }

    public sealed class ProductProfileDetailDto
    {
        public Guid Id { get; set; }
        public int CompanyId { get; set; }
        public string ProductNo { get; set; } = "";
        public string ProductName { get; set; } = "";
        public string HsCode { get; set; } = "";
        public int? SaleTypeId { get; set; }
        public int? RateId { get; set; }
        public decimal? RateValue { get; set; }
        public decimal? PurchasePrice { get; set; }
        public int? SroId { get; set; }
        public int? SroItemId { get; set; }
        public string? FbrProductType { get; set; }
        public string? SroScheduleNoText { get; set; }
        public string? SroItemRefText { get; set; }
        public bool FixedNotifiedApplicable { get; set; }
        public decimal? MrpRateValue { get; set; }
        public int? FbrUomId { get; set; }
        public int? FbrPdiTransTypeId { get; set; }
        public string? ProductImage { get; set; }
        public DateTime CreatedAtUtc { get; set; }
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
}
