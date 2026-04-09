using System.Security.Claims;
using System.Text.Json;
using FbrSmartApp.Api.Auth;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using FbrSmartApp.Api.Services.Fbr;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/companies")]
[Authorize]
public sealed class CompaniesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly IFbrPdiSyncService _fbrPdiSync;
    private readonly IOptions<AuthOptions> _authOptions;

    public CompaniesController(
        AppDbContext db,
        IWebHostEnvironment env,
        IFbrPdiSyncService fbrPdiSync,
        IOptions<AuthOptions> authOptions)
    {
        _db = db;
        _env = env;
        _fbrPdiSync = fbrPdiSync;
        _authOptions = authOptions;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyCompany(CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var company = await _db.Companies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == companyId, ct);
        if (company is null) return NotFound();

        var chatter = await _db.CompanyChatterMessages.AsNoTracking()
            .Where(x => x.CompanyId == companyId)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync(ct);
        var pdi = await _db.FbrPdiSyncStates.AsNoTracking()
            .FirstOrDefaultAsync(x => x.CompanyId == companyId, ct);

        Response.Headers["Content-Range"] = "companies 0-0/1";
        return Ok(new[] { MapCompany(company, chatter, pdi) });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Company>> GetOne(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        if (id != companyId) return Forbid();

        var company = await _db.Companies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (company is null) return NotFound();
        var chatter = await _db.CompanyChatterMessages.AsNoTracking()
            .Where(x => x.CompanyId == companyId)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync(ct);
        var pdi = await _db.FbrPdiSyncStates.AsNoTracking()
            .FirstOrDefaultAsync(x => x.CompanyId == companyId, ct);
        return Ok(MapCompany(company, chatter, pdi));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<Company>> Update(int id, [FromBody] UpdateCompanyRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        if (id != companyId) return Forbid();

        var company = await _db.Companies.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (company is null) return NotFound();

        var oldSandbox = company.FbrTokenSandBox?.Trim();
        var oldProduction = company.FbrTokenProduction?.Trim();

        company.Title = request.Title ?? company.Title;
        company.ShortTitle = request.ShortTitle ?? company.ShortTitle;
        company.Email = request.Email;
        company.Address = request.Address;
        company.Phone = request.Phone;
        company.website = request.website;
        company.NTNNo = request.NTNNo;
        company.St_Registration = request.St_Registration;
        company.FbrProvinceId = request.FbrProvinceId;
        company.EmployeeCount = request.EmployeeCount;

        company.EnableSandBox = request.EnableSandBox;
        company.FbrTokenSandBox = request.FbrTokenSandBox;
        company.FbrTokenProduction = request.FbrTokenProduction;

        if (!string.IsNullOrWhiteSpace(request.LogoBase64))
        {
            var path = await SaveLogoAsync(company.Id, request.LogoBase64, ct);
            company.CompanyImage = path;
        }

        await _db.SaveChangesAsync(ct);

        string? fbrPdiSyncWarning = null;
        var newSandbox = company.FbrTokenSandBox?.Trim();
        var newProduction = company.FbrTokenProduction?.Trim();
        var tokensChanged = !string.Equals(oldSandbox, newSandbox, StringComparison.Ordinal) ||
                            !string.Equals(oldProduction, newProduction, StringComparison.Ordinal);
        if (tokensChanged &&
            (!string.IsNullOrWhiteSpace(newSandbox) || !string.IsNullOrWhiteSpace(newProduction)))
        {
            var syncResult = await _fbrPdiSync.SyncAsync(companyId, ct);
            if (!syncResult.Success)
                fbrPdiSyncWarning = syncResult.Error;
        }

        var chatter = await _db.CompanyChatterMessages.AsNoTracking()
            .Where(x => x.CompanyId == companyId)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync(ct);
        var pdi = await _db.FbrPdiSyncStates.AsNoTracking()
            .FirstOrDefaultAsync(x => x.CompanyId == companyId, ct);
        return Ok(MapCompany(company, chatter, pdi, fbrPdiSyncWarning));
    }

    /// <summary>Platform tenant admins may activate or deactivate other companies.</summary>
    [HttpPut("{id:int}/activation")]
    public async Task<IActionResult> SetCompanyActivation(
        int id,
        [FromBody] SetCompanyActivationRequest body,
        CancellationToken ct)
    {
        var callerCompanyId = GetCompanyIdOrThrow();
        if (callerCompanyId != _authOptions.Value.PlatformCompanyId) return Forbid();

        var role = User.FindFirstValue(ClaimTypes.Role);
        if (!string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase)) return Forbid();

        var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (company is null) return NotFound();

        company.IsActivated = body.IsActivated;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id:int}/fbr-pdi-sync")]
    public async Task<IActionResult> SyncFbrPdi(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        if (id != companyId) return Forbid();

        var result = await _fbrPdiSync.SyncAsync(companyId, ct);
        if (!result.Success)
            return Ok(new { success = false, error = result.Error });

        return Ok(new { success = true, syncedAtUtc = result.SyncedAtUtc });
    }

    [HttpPost("{id:int}/chatter")]
    public async Task<ActionResult<ChatterMessageDto>> PostChatter(
        int id,
        [FromBody] PostChatterRequest req,
        CancellationToken ct
    )
    {
        var companyId = GetCompanyIdOrThrow();
        if (id != companyId) return Forbid();

        var company = await _db.Companies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (company is null) return NotFound();

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

        var msg = new CompanyChatterMessage
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Body = req.Body?.Trim() ?? "",
            CreatedAtUtc = DateTime.UtcNow,
            AuthorDisplayName = author,
            AttachmentsJson = attachmentsJson,
        };
        _db.CompanyChatterMessages.Add(msg);
        await _db.SaveChangesAsync(ct);
        return Ok(MapChatter(msg));
    }

    [HttpGet("my")]
    public async Task<ActionResult<Company>> GetMyCompanySingle(CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var company = await _db.Companies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == companyId, ct);
        if (company is null) return NotFound();
        var chatter = await _db.CompanyChatterMessages.AsNoTracking()
            .Where(x => x.CompanyId == companyId)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync(ct);
        var pdi = await _db.FbrPdiSyncStates.AsNoTracking()
            .FirstOrDefaultAsync(x => x.CompanyId == companyId, ct);
        return Ok(MapCompany(company, chatter, pdi));
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

    private async Task<string> SaveLogoAsync(int companyId, string logoBase64, CancellationToken ct)
    {
        // supports "data:image/png;base64,..." or raw base64
        var base64 = logoBase64;
        var ext = "png";
        var comma = logoBase64.IndexOf(',');
        if (logoBase64.StartsWith("data:", StringComparison.OrdinalIgnoreCase) && comma >= 0)
        {
            var header = logoBase64.Substring(0, comma);
            base64 = logoBase64[(comma + 1)..];
            if (header.Contains("image/jpeg", StringComparison.OrdinalIgnoreCase)) ext = "jpg";
            if (header.Contains("image/png", StringComparison.OrdinalIgnoreCase)) ext = "png";
            if (header.Contains("image/webp", StringComparison.OrdinalIgnoreCase)) ext = "webp";
        }

        var bytes = Convert.FromBase64String(base64);

        var uploads = Path.Combine(_env.ContentRootPath, "uploads", "companies", companyId.ToString());
        Directory.CreateDirectory(uploads);

        var fileName = $"logo.{ext}";
        var fullPath = Path.Combine(uploads, fileName);
        await System.IO.File.WriteAllBytesAsync(fullPath, bytes, ct);

        // store relative path
        return Path.Combine("uploads", "companies", companyId.ToString(), fileName).Replace('\\', '/');
    }

    public sealed class SetCompanyActivationRequest
    {
        public bool IsActivated { get; set; }
    }

    public sealed class UpdateCompanyRequest
    {
        public string? Title { get; set; }
        public string? ShortTitle { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? website { get; set; }
        public string? NTNNo { get; set; }
        public string? St_Registration { get; set; }

        public int? FbrProvinceId { get; set; }

        public int? EmployeeCount { get; set; }

        public bool EnableSandBox { get; set; }
        public string? FbrTokenSandBox { get; set; }
        public string? FbrTokenProduction { get; set; }

        public string? LogoBase64 { get; set; }
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

    private static object MapCompany(
        Company c,
        List<CompanyChatterMessage> chatter,
        FbrPdiSyncState? pdi,
        string? fbrPdiSyncWarning = null) => new
    {
        id = c.Id,
        title = c.Title,
        shortTitle = c.ShortTitle,
        email = c.Email,
        address = c.Address,
        phone = c.Phone,
        website = c.website,
        ntnNo = c.NTNNo,
        st_Registration = c.St_Registration,
        companyImage = c.CompanyImage,
        inactive = c.Inactive,
        saleEmail = c.SaleEmail,
        mainCompanyID = c.MainCompanyID,
        postalCode = c.PostalCode,
        poBoxNo = c.PoBoxNo,
        faxNo = c.FaxNo,
        isActivated = c.IsActivated,
        fbrTokenSandBox = c.FbrTokenSandBox,
        fbrTokenProduction = c.FbrTokenProduction,
        enableSandBox = c.EnableSandBox,
        fbrProvinceId = c.FbrProvinceId,
        employeeCount = c.EmployeeCount,
        fbrPdiLastSuccessAtUtc = pdi?.LastSuccessAtUtc,
        fbrPdiLastError = pdi?.LastError,
        fbrPdiSyncWarning,
        chatterMessages = chatter.OrderBy(x => x.CreatedAtUtc).Select(MapChatter).ToList(),
    };

    private static ChatterMessageDto MapChatter(CompanyChatterMessage m)
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
}

