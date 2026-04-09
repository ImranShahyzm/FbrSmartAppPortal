using System.Security.Claims;
using System.Text.Json;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/customers")]
[Authorize]
public sealed class CustomersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public CustomersController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] string? filter, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();

        var query = _db.Customers.AsNoTracking()
            .Where(x => (x.CompanyID ?? 0) == companyId);

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
                            (x.PartyName != null && x.PartyName.Contains(qq)) ||
                            (x.PartyBusinessName != null && x.PartyBusinessName.Contains(qq)) ||
                            (x.NTNNO != null && x.NTNNO.Contains(qq)));
                    }
                }
            }
            catch (JsonException)
            {
                // ignore
            }
        }

        query = query.OrderBy(x => x.PartyName);

        var total = await query.CountAsync(ct);
        var items = await query.Take(1000).ToListAsync(ct);

        Response.Headers["Content-Range"] = $"customers 0-{Math.Max(items.Count - 1, 0)}/{total}";
        return Ok(items);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CustomerParty>> GetOne(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var item = await _db.Customers.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && (x.CompanyID ?? 0) == companyId, ct);
        if (item is null) return NotFound();
        return Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<CustomerParty>> Create([FromBody] UpsertCustomerRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();

        var entity = new CustomerParty
        {
            CompanyID = companyId,
            PartyName = request.PartyName,
            PartyBusinessName = request.PartyBusinessName,
            AddressOne = request.AddressOne,
            PhoneOne = request.PhoneOne,
            ContactPerson = request.ContactPerson,
            ContactPersonMobile = request.ContactPersonMobile,
            Email = request.Email,
            NTNNO = request.NTNNO,
            SaleTaxRegNo = request.SaleTaxRegNo,
            ProvinceID = request.ProvinceID,
            FbrStatusActive = request.FbrStatusActive ?? true,
        };

        _db.Customers.Add(entity);
        await _db.SaveChangesAsync(ct);

        if (!string.IsNullOrWhiteSpace(request.BusinessLogoBase64))
        {
            entity.PartyBusinessLogo = await SaveLogoAsync(companyId, entity.Id, request.BusinessLogoBase64, ct);
            await _db.SaveChangesAsync(ct);
        }

        return Ok(entity);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CustomerParty>> Update(int id, [FromBody] UpsertCustomerRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var entity = await _db.Customers.FirstOrDefaultAsync(x => x.Id == id && (x.CompanyID ?? 0) == companyId, ct);
        if (entity is null) return NotFound();

        entity.PartyName = request.PartyName;
        entity.PartyBusinessName = request.PartyBusinessName;
        entity.AddressOne = request.AddressOne;
        entity.PhoneOne = request.PhoneOne;
        entity.ContactPerson = request.ContactPerson;
        entity.ContactPersonMobile = request.ContactPersonMobile;
        entity.Email = request.Email;
        entity.NTNNO = request.NTNNO;
        entity.SaleTaxRegNo = request.SaleTaxRegNo;
        entity.ProvinceID = request.ProvinceID;
        entity.FbrStatusActive = request.FbrStatusActive ?? entity.FbrStatusActive;

        if (!string.IsNullOrWhiteSpace(request.BusinessLogoBase64))
        {
            entity.PartyBusinessLogo = await SaveLogoAsync(companyId, entity.Id, request.BusinessLogoBase64, ct);
        }

        await _db.SaveChangesAsync(ct);
        return Ok(entity);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var entity = await _db.Customers.FirstOrDefaultAsync(x => x.Id == id && (x.CompanyID ?? 0) == companyId, ct);
        if (entity is null) return NotFound();

        _db.Customers.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return Ok(new { id });
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

    private async Task<string> SaveLogoAsync(int companyId, int partyId, string base64DataUrl, CancellationToken ct)
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
        var dir = Path.Combine(_env.ContentRootPath, "uploads", "parties", companyId.ToString(), partyId.ToString());
        Directory.CreateDirectory(dir);

        var fileName = $"logo.{ext}";
        var fullPath = Path.Combine(dir, fileName);
        await System.IO.File.WriteAllBytesAsync(fullPath, bytes, ct);

        return Path.Combine("uploads", "parties", companyId.ToString(), partyId.ToString(), fileName).Replace('\\', '/');
    }

    public sealed class UpsertCustomerRequest
    {
        public string? PartyName { get; set; }
        public string? PartyBusinessName { get; set; }
        public string? AddressOne { get; set; }
        public string? PhoneOne { get; set; }
        public string? ContactPerson { get; set; }
        public string? ContactPersonMobile { get; set; }
        public string? Email { get; set; }
        public string? NTNNO { get; set; }
        public string? SaleTaxRegNo { get; set; }
        public int? ProvinceID { get; set; }
        public string? BusinessLogoBase64 { get; set; }
        public bool? FbrStatusActive { get; set; }
    }
}

