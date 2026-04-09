using System.Security.Claims;
using System.Text.Json;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using FbrSmartApp.Api.Models.AdminPortal;
using FbrSmartApp.Api.Services;
using FbrSmartApp.Api.Services.Fbr;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/admin/companies")]
[Authorize(AuthenticationSchemes = "AdminJwt")]
public sealed class AdminCompaniesController : ControllerBase
{
    private readonly AppDbContext _appDb;
    private readonly AdminPortalDbContext _adminDb;
    private readonly IFbrPdiSyncService _fbrPdiSync;
    private readonly IRegistrationEmailSender _email;
    private readonly IWebHostEnvironment _env;

    public AdminCompaniesController(
        AppDbContext appDb,
        AdminPortalDbContext adminDb,
        IFbrPdiSyncService fbrPdiSync,
        IRegistrationEmailSender email,
        IWebHostEnvironment env)
    {
        _appDb = appDb;
        _adminDb = adminDb;
        _fbrPdiSync = fbrPdiSync;
        _email = email;
        _env = env;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(CancellationToken ct)
    {
        var companies = await _appDb.Companies.AsNoTracking()
            .OrderBy(c => c.Id)
            .ToListAsync(ct);

        var ids = companies.Select(c => c.Id).ToArray();
        var onboarding = await _adminDb.CompanyOnboardings.AsNoTracking()
            .Where(o => ids.Contains(o.CompanyId))
            .ToListAsync(ct);
        var onboardingById = onboarding.ToDictionary(o => o.CompanyId, o => o);

        // Ensure onboarding rows exist (idempotent)
        var missing = ids.Where(id => !onboardingById.ContainsKey(id)).ToArray();
        if (missing.Length > 0)
        {
            foreach (var id in missing)
            {
                var registeredAtUtc = await _appDb.Users.AsNoTracking()
                    .Where(u => u.CompanyId == id)
                    .OrderBy(u => u.CreatedAtUtc)
                    .Select(u => (DateTime?)u.CreatedAtUtc)
                    .FirstOrDefaultAsync(ct) ?? DateTime.UtcNow;

                _adminDb.CompanyOnboardings.Add(new CompanyOnboarding
                {
                    CompanyId = id,
                    RegisteredAtUtc = registeredAtUtc,
                    PaymentStatus = "pending",
                    PaymentModel = "monthly",
                });
            }
            await _adminDb.SaveChangesAsync(ct);

            onboarding = await _adminDb.CompanyOnboardings.AsNoTracking()
                .Where(o => ids.Contains(o.CompanyId))
                .ToListAsync(ct);
            onboardingById = onboarding.ToDictionary(o => o.CompanyId, o => o);
        }

        var rows = companies.Select(c =>
        {
            onboardingById.TryGetValue(c.Id, out var o);
            return new
            {
                id = c.Id,
                title = c.Title,
                shortTitle = c.ShortTitle,
                ntnNo = c.NTNNo,
                email = c.Email,
                phone = c.Phone,
                isActivated = c.IsActivated,
                registeredAtUtc = o?.RegisteredAtUtc,
                paymentStatus = o?.PaymentStatus,
                paymentModel = o?.PaymentModel,
                amount = o?.Amount,
                currency = o?.Currency,
                deactivatedAtUtc = o?.DeactivatedAtUtc,
            };
        }).ToList();

        Response.Headers["Content-Range"] = $"companies 0-{Math.Max(rows.Count - 1, 0)}/{rows.Count}";
        return Ok(rows);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetOne(int id, CancellationToken ct)
    {
        var payload = await BuildCompanyAdminDetailAsync(id, ct);
        return payload is null ? NotFound() : Ok(payload);
    }

    /// <summary>Full profile update for admin portal (react-admin PUT). Does not change activation — use /activation.</summary>
    [HttpPut("{id:int}")]
    [RequestSizeLimit(52_428_800)]
    public async Task<IActionResult> Put(int id, [FromBody] AdminCompanyPutRequest req, CancellationToken ct)
    {
        var company = await _appDb.Companies.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (company is null) return NotFound();

        var onboarding = await _adminDb.CompanyOnboardings.FirstOrDefaultAsync(o => o.CompanyId == id, ct);
        if (onboarding is null)
        {
            onboarding = new CompanyOnboarding
            {
                CompanyId = id,
                RegisteredAtUtc = DateTime.UtcNow,
                PaymentStatus = "pending",
                PaymentModel = "monthly",
            };
            _adminDb.CompanyOnboardings.Add(onboarding);
        }

        var payStatus = string.IsNullOrWhiteSpace(req.PaymentStatus)
            ? onboarding.PaymentStatus
            : req.PaymentStatus.Trim();
        var payModel = string.IsNullOrWhiteSpace(req.PaymentModel)
            ? onboarding.PaymentModel
            : req.PaymentModel.Trim();
        if (!IsAllowedPaymentStatus(payStatus))
            return BadRequest(new { message = "Invalid paymentStatus." });
        if (!IsAllowedPaymentModel(payModel))
            return BadRequest(new { message = "Invalid paymentModel." });

        if (req.FbrProvinceId is int pid &&
            !await _appDb.FbrProvinces.AsNoTracking().AnyAsync(p => p.Id == pid, ct))
            return BadRequest(new { message = "Invalid FBR province." });

        // Snapshot before edits (human-readable audit trail)
        var pTitle = company.Title;
        var pShort = company.ShortTitle;
        var pEmail = company.Email;
        var pPhone = company.Phone;
        var pWeb = company.website;
        var pNtn = company.NTNNo;
        var pEmp = company.EmployeeCount;
        var pEn = company.EnableSandBox;
        var pTs = company.FbrTokenSandBox;
        var pTp = company.FbrTokenProduction;
        var pPid = company.FbrProvinceId;
        var pCompanyImage = company.CompanyImage;
        var oPay = onboarding.PaymentStatus;
        var oPm = onboarding.PaymentModel;
        var oPn = onboarding.PaymentNotes;
        var oAm = onboarding.Amount;
        var oCur = onboarding.Currency;

        var oldSandbox = company.FbrTokenSandBox?.Trim();
        var oldProduction = company.FbrTokenProduction?.Trim();
        var oldProvince = company.FbrProvinceId;

        company.Title = string.IsNullOrWhiteSpace(req.Title) ? company.Title : req.Title.Trim();
        company.ShortTitle = string.IsNullOrWhiteSpace(req.ShortTitle) ? company.ShortTitle : req.ShortTitle.Trim();
        company.Email = req.Email is null ? company.Email : string.IsNullOrWhiteSpace(req.Email) ? null : req.Email.Trim();
        company.Phone = req.Phone is null ? company.Phone : string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim();
        company.website = req.Website is null ? company.website : string.IsNullOrWhiteSpace(req.Website) ? null : req.Website.Trim();
        company.NTNNo = req.NtnNo is null ? company.NTNNo : string.IsNullOrWhiteSpace(req.NtnNo) ? null : req.NtnNo.Trim();
        company.EmployeeCount = req.EmployeeCount ?? company.EmployeeCount;
        company.EnableSandBox = req.EnableSandBox;
        company.FbrTokenSandBox = req.FbrTokenSandBox is null
            ? company.FbrTokenSandBox
            : string.IsNullOrWhiteSpace(req.FbrTokenSandBox) ? null : req.FbrTokenSandBox.Trim();
        company.FbrTokenProduction = req.FbrTokenProduction is null
            ? company.FbrTokenProduction
            : string.IsNullOrWhiteSpace(req.FbrTokenProduction) ? null : req.FbrTokenProduction.Trim();
        company.FbrProvinceId = req.FbrProvinceId;

        if (!string.IsNullOrWhiteSpace(req.LogoBase64))
        {
            var path = await SaveCompanyLogoAsync(company.Id, req.LogoBase64!, ct);
            company.CompanyImage = path;
        }

        onboarding.PaymentStatus = payStatus;
        onboarding.PaymentModel = payModel;
        onboarding.PaymentNotes = req.PaymentNotes is null
            ? onboarding.PaymentNotes
            : string.IsNullOrWhiteSpace(req.PaymentNotes) ? null : req.PaymentNotes.Trim();
        onboarding.Amount = req.Amount ?? onboarding.Amount;
        onboarding.Currency = req.Currency is null
            ? onboarding.Currency
            : string.IsNullOrWhiteSpace(req.Currency) ? null : req.Currency.Trim();
        onboarding.LastUpdatedAtUtc = DateTime.UtcNow;
        onboarding.LastUpdatedByEmail = User.FindFirstValue("adminEmail") ?? "";

        await _appDb.SaveChangesAsync(ct);
        await _adminDb.SaveChangesAsync(ct);

        string? syncWarning = null;
        var newSandbox = company.FbrTokenSandBox?.Trim();
        var newProduction = company.FbrTokenProduction?.Trim();
        var tokensChanged = !string.Equals(oldSandbox, newSandbox, StringComparison.Ordinal) ||
                            !string.Equals(oldProduction, newProduction, StringComparison.Ordinal);
        var provinceChanged = oldProvince != company.FbrProvinceId;
        if ((tokensChanged || provinceChanged) &&
            (!string.IsNullOrWhiteSpace(newSandbox) || !string.IsNullOrWhiteSpace(newProduction)))
        {
            var syncResult = await _fbrPdiSync.SyncAsync(id, ct);
            if (!syncResult.Success) syncWarning = syncResult.Error;
        }

        var profileChanges = await BuildProfileChangeListAsync(
            pTitle, pShort, pEmail, pPhone, pWeb, pNtn, pEmp, pEn, pTs, pTp, pPid,
            oPay, oPm, oPn, oAm, oCur,
            company, onboarding, ct);
        if (!string.IsNullOrWhiteSpace(req.LogoBase64))
        {
            profileChanges.Add(new AuditChangeVm
            {
                Label = "Company logo",
                Before = string.IsNullOrWhiteSpace(pCompanyImage) ? "None" : "Previous image",
                After = "Updated",
            });
        }

        if (profileChanges.Count > 0)
            await LogAuditAsync(id, "companies", "company.profile.update", SerializeAuditPayload(profileChanges), ct);

        var profileActivityNote = string.IsNullOrWhiteSpace(syncWarning)
            ? null
            : $"FBR reference sync (optional, save still applied): {syncWarning}";
        await LogActivityAsync(id, "company.profile.update", profileActivityNote, ct);

        var payload = await BuildCompanyAdminDetailAsync(id, ct);
        return payload is null ? NotFound() : Ok(payload);
    }

    private async Task<object?> BuildCompanyAdminDetailAsync(int id, CancellationToken ct)
    {
        var company = await _appDb.Companies.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct);
        if (company is null) return null;

        var onboarding = await _adminDb.CompanyOnboardings.AsNoTracking().FirstOrDefaultAsync(o => o.CompanyId == id, ct);
        if (onboarding is null)
        {
            onboarding = new CompanyOnboarding
            {
                CompanyId = id,
                RegisteredAtUtc = DateTime.UtcNow,
                PaymentStatus = "pending",
                PaymentModel = "monthly",
            };
            _adminDb.CompanyOnboardings.Add(onboarding);
            await _adminDb.SaveChangesAsync(ct);
            onboarding = await _adminDb.CompanyOnboardings.AsNoTracking().FirstAsync(o => o.CompanyId == id, ct);
        }

        var adminEmail = User.FindFirstValue("adminEmail") ?? "";

        var chatter = await _adminDb.AdminCompanyChatterMessages.AsNoTracking()
            .Where(x => x.CompanyId == id)
            .ToListAsync(ct);

        var activities = await _adminDb.AdminActivities.AsNoTracking()
            .Where(a => a.CompanyId == id)
            .ToListAsync(ct);

        var audits = await _adminDb.AdminAuditLogs.AsNoTracking()
            .Where(a => a.CompanyId == id)
            .ToListAsync(ct);

        var timeline = new List<(DateTime Ts, object Entry)>();
        foreach (var m in chatter)
        {
            timeline.Add((m.CreatedAtUtc, new
            {
                kind = "chatter",
                id = m.Id.ToString("N"),
                createdAt = m.CreatedAtUtc.ToString("O"),
                authorDisplayName = m.AuthorDisplayName ?? m.AuthorEmail,
                body = m.Body,
                attachments = DeserializeAttachments(m.AttachmentsJson),
            }));
        }

        foreach (var a in activities)
        {
            timeline.Add((a.CreatedAtUtc, new
            {
                kind = "activity",
                id = a.Id.ToString("N"),
                createdAt = a.CreatedAtUtc.ToString("O"),
                adminEmail = a.AdminEmail,
                action = a.Action,
                notes = a.Notes,
            }));
        }

        foreach (var a in audits)
        {
            timeline.Add((a.CreatedAtUtc, new
            {
                kind = "audit",
                id = a.Id.ToString("N"),
                createdAt = a.CreatedAtUtc.ToString("O"),
                adminEmail = a.AdminEmail,
                resource = a.Resource,
                action = a.Action,
                payloadJson = a.PayloadJson,
            }));
        }

        var timelineSorted = timeline
            .OrderByDescending(x => x.Ts)
            .Select(x => x.Entry)
            .ToList();

        return new
        {
            id = company.Id,
            title = company.Title,
            shortTitle = company.ShortTitle,
            email = company.Email,
            address = company.Address,
            phone = company.Phone,
            website = company.website,
            ntnNo = company.NTNNo,
            st_Registration = company.St_Registration,
            companyImage = company.CompanyImage,
            inactive = company.Inactive,
            fbrTokenSandBox = company.FbrTokenSandBox,
            fbrTokenProduction = company.FbrTokenProduction,
            enableSandBox = company.EnableSandBox,
            fbrProvinceId = company.FbrProvinceId,
            employeeCount = company.EmployeeCount,
            isActivated = company.IsActivated,
            registeredAtUtc = onboarding.RegisteredAtUtc,
            paymentStatus = onboarding.PaymentStatus,
            paymentModel = onboarding.PaymentModel,
            paymentNotes = onboarding.PaymentNotes,
            amount = onboarding.Amount,
            currency = onboarding.Currency,
            activatedAtUtc = onboarding.ActivatedAtUtc,
            deactivatedAtUtc = onboarding.DeactivatedAtUtc,
            timeline = timelineSorted,
            _meta = new { viewedBy = adminEmail },
        };
    }

    [HttpPost("{id:int}/chatter")]
    public async Task<IActionResult> PostChatter(int id, [FromBody] PostChatterRequest req, CancellationToken ct)
    {
        if (!await _appDb.Companies.AsNoTracking().AnyAsync(c => c.Id == id, ct))
            return NotFound();

        var adminEmail = User.FindFirstValue("adminEmail") ?? "";
        var fullName = User.FindFirstValue("fullName");
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "";
        Guid.TryParse(sub, out var adminId);

        string? attachmentsJson = null;
        if (req.Attachments is { Count: > 0 })
        {
            var list = new List<object>();
            foreach (var a in req.Attachments)
            {
                if (string.IsNullOrWhiteSpace(a.DataBase64)) continue;
                var raw = a.DataBase64.Trim();
                if (raw.Length > 600_000) continue;
                list.Add(new { name = a.Name ?? "file", mime = a.Mime ?? "application/octet-stream", dataBase64 = raw });
            }
            attachmentsJson = JsonSerializer.Serialize(list);
        }

        var msg = new AdminCompanyChatterMessage
        {
            Id = Guid.NewGuid(),
            CompanyId = id,
            CreatedAtUtc = DateTime.UtcNow,
            AdminUserId = adminId,
            AuthorEmail = adminEmail,
            AuthorDisplayName = string.IsNullOrWhiteSpace(fullName) ? adminEmail : fullName,
            Body = (req.Body ?? "").Trim(),
            AttachmentsJson = attachmentsJson,
        };
        _adminDb.AdminCompanyChatterMessages.Add(msg);
        await _adminDb.SaveChangesAsync(ct);

        await LogActivityAsync(id, "company.chatter.post", null, ct);
        var attCount = req.Attachments?.Count(a => !string.IsNullOrWhiteSpace(a.DataBase64)) ?? 0;
        var preview = TruncateForDisplay(req.Body?.Trim(), 240);
        await LogAuditAsync(
            id,
            "companies",
            "company.chatter.post",
            JsonSerializer.Serialize(new
            {
                summary = "Internal note posted",
                preview,
                attachmentCount = attCount,
            }),
            ct);
        return Ok(new { success = true });
    }

    [HttpPut("{id:int}/payment")]
    public async Task<IActionResult> SetPayment(int id, [FromBody] SetPaymentRequest req, CancellationToken ct)
    {
        if (!await _appDb.Companies.AsNoTracking().AnyAsync(c => c.Id == id, ct))
            return NotFound();

        var onboarding = await _adminDb.CompanyOnboardings.FirstOrDefaultAsync(o => o.CompanyId == id, ct);
        if (onboarding is null)
        {
            onboarding = new CompanyOnboarding { CompanyId = id };
            _adminDb.CompanyOnboardings.Add(onboarding);
        }

        if (!IsAllowedPaymentStatus(req.PaymentStatus))
            return BadRequest(new { message = "Invalid paymentStatus." });
        if (!IsAllowedPaymentModel(req.PaymentModel))
            return BadRequest(new { message = "Invalid paymentModel." });

        var bPay = onboarding.PaymentStatus;
        var bPm = onboarding.PaymentModel;
        var bPn = onboarding.PaymentNotes;
        var bAm = onboarding.Amount;
        var bCur = onboarding.Currency;

        onboarding.PaymentStatus = req.PaymentStatus.Trim();
        onboarding.PaymentModel = req.PaymentModel.Trim();
        onboarding.PaymentNotes = string.IsNullOrWhiteSpace(req.PaymentNotes) ? null : req.PaymentNotes.Trim();
        onboarding.Amount = req.Amount;
        onboarding.Currency = string.IsNullOrWhiteSpace(req.Currency) ? null : req.Currency.Trim();
        onboarding.LastUpdatedAtUtc = DateTime.UtcNow;
        onboarding.LastUpdatedByEmail = User.FindFirstValue("adminEmail") ?? "";

        await _adminDb.SaveChangesAsync(ct);

        var payChanges = BuildPaymentChangeList(bPay, bPm, bPn, bAm, bCur, onboarding);
        await LogActivityAsync(id, "payment.update", null, ct);
        if (payChanges.Count > 0)
            await LogAuditAsync(id, "companies", "payment.update", SerializeAuditPayload(payChanges), ct);
        return NoContent();
    }

    [HttpPut("{id:int}/fbr-tokens")]
    public async Task<IActionResult> SetFbrTokens(int id, [FromBody] SetFbrTokensRequest req, CancellationToken ct)
    {
        var company = await _appDb.Companies.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (company is null) return NotFound();

        var oldSandbox = company.FbrTokenSandBox?.Trim();
        var oldProduction = company.FbrTokenProduction?.Trim();
        var bEn = company.EnableSandBox;
        var bPid = company.FbrProvinceId;

        company.EnableSandBox = req.EnableSandBox;
        company.FbrTokenSandBox = string.IsNullOrWhiteSpace(req.FbrTokenSandBox) ? null : req.FbrTokenSandBox.Trim();
        company.FbrTokenProduction = string.IsNullOrWhiteSpace(req.FbrTokenProduction) ? null : req.FbrTokenProduction.Trim();
        company.FbrProvinceId = req.FbrProvinceId;

        await _appDb.SaveChangesAsync(ct);

        string? syncWarning = null;
        var newSandbox = company.FbrTokenSandBox?.Trim();
        var newProduction = company.FbrTokenProduction?.Trim();
        var tokensChanged = !string.Equals(oldSandbox, newSandbox, StringComparison.Ordinal) ||
                            !string.Equals(oldProduction, newProduction, StringComparison.Ordinal);
        if (tokensChanged &&
            (!string.IsNullOrWhiteSpace(newSandbox) || !string.IsNullOrWhiteSpace(newProduction)))
        {
            var syncResult = await _fbrPdiSync.SyncAsync(id, ct);
            if (!syncResult.Success) syncWarning = syncResult.Error;
        }

        var tokChanges = await BuildTokenChangeListAsync(bEn, bPid, oldSandbox, oldProduction, company, ct);
        await LogActivityAsync(id, "company.tokens.update", syncWarning, ct);
        if (tokChanges.Count > 0)
            await LogAuditAsync(id, "companies", "company.tokens.update", SerializeAuditPayload(tokChanges), ct);
        return Ok(new { success = true, warning = syncWarning });
    }

    [HttpPut("{id:int}/activation")]
    public async Task<IActionResult> SetActivation(int id, [FromBody] SetActivationRequest req, CancellationToken ct)
    {
        var company = await _appDb.Companies.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (company is null) return NotFound();

        company.IsActivated = req.IsActivated;
        await _appDb.SaveChangesAsync(ct);

        var onboarding = await _adminDb.CompanyOnboardings.FirstOrDefaultAsync(o => o.CompanyId == id, ct);
        if (onboarding is null)
        {
            onboarding = new CompanyOnboarding { CompanyId = id };
            _adminDb.CompanyOnboardings.Add(onboarding);
        }

        if (req.IsActivated)
        {
            onboarding.ActivatedAtUtc = DateTime.UtcNow;
            onboarding.DeactivatedAtUtc = null;
        }
        else
        {
            onboarding.DeactivatedAtUtc = DateTime.UtcNow;
        }
        await _adminDb.SaveChangesAsync(ct);

        await LogActivityAsync(id, req.IsActivated ? "company.activate" : "company.deactivate", req.Notes, ct);
        var actSummary = req.IsActivated ? "Company activated" : "Company deactivated";
        await LogAuditAsync(
            id,
            "companies",
            req.IsActivated ? "company.activate" : "company.deactivate",
            JsonSerializer.Serialize(new
            {
                summary = actSummary,
                notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            }),
            ct);

        if (req.IsActivated)
        {
            var adminUser = await _appDb.Users.AsNoTracking()
                .Where(u => u.CompanyId == id)
                .OrderBy(u => u.CreatedAtUtc)
                .FirstOrDefaultAsync(ct);
            if (adminUser?.Email != null && adminUser.Email.Trim() != "")
            {
                await _email.SendCompanyActivatedAsync(
                    adminUser.Email,
                    adminUser.FullName,
                    company.Title,
                    adminUser.Email,
                    ct);
            }
        }

        return NoContent();
    }

    [HttpGet("/api/admin/activities")]
    public async Task<IActionResult> GetActivities(CancellationToken ct)
    {
        var items = await _adminDb.AdminActivities.AsNoTracking()
            .OrderByDescending(a => a.CreatedAtUtc)
            .Take(500)
            .ToListAsync(ct);

        var rows = items.Select(a => new
        {
            id = a.Id,
            createdAtUtc = a.CreatedAtUtc,
            adminEmail = a.AdminEmail,
            companyId = a.CompanyId,
            action = a.Action,
            notes = a.Notes,
        }).ToList();

        Response.Headers["Content-Range"] = $"activities 0-{Math.Max(rows.Count - 1, 0)}/{rows.Count}";
        return Ok(rows);
    }

    [HttpGet("/api/admin/audit-logs")]
    public async Task<IActionResult> GetAuditLogs(CancellationToken ct)
    {
        var items = await _adminDb.AdminAuditLogs.AsNoTracking()
            .OrderByDescending(a => a.CreatedAtUtc)
            .Take(500)
            .ToListAsync(ct);

        var rows = items.Select(a => new
        {
            id = a.Id,
            createdAtUtc = a.CreatedAtUtc,
            adminEmail = a.AdminEmail,
            resource = a.Resource,
            action = a.Action,
            companyId = a.CompanyId,
            payloadJson = a.PayloadJson,
        }).ToList();

        Response.Headers["Content-Range"] = $"audit-logs 0-{Math.Max(rows.Count - 1, 0)}/{rows.Count}";
        return Ok(rows);
    }

    private async Task LogActivityAsync(int? companyId, string action, string? notes, CancellationToken ct)
    {
        var adminEmail = User.FindFirstValue("adminEmail") ?? User.Identity?.Name ?? "";
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "";
        Guid.TryParse(sub, out var adminId);

        _adminDb.AdminActivities.Add(new AdminActivity
        {
            Id = Guid.NewGuid(),
            CreatedAtUtc = DateTime.UtcNow,
            AdminUserId = adminId,
            AdminEmail = adminEmail,
            CompanyId = companyId,
            Action = action,
            Notes = string.IsNullOrWhiteSpace(notes) ? null : notes,
        });
        await _adminDb.SaveChangesAsync(ct);
    }

    private async Task LogAuditAsync(int? companyId, string resource, string action, string? payloadJson, CancellationToken ct)
    {
        var adminEmail = User.FindFirstValue("adminEmail") ?? User.Identity?.Name ?? "";
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "";
        Guid.TryParse(sub, out var adminId);

        _adminDb.AdminAuditLogs.Add(new AdminAuditLog
        {
            Id = Guid.NewGuid(),
            CreatedAtUtc = DateTime.UtcNow,
            AdminUserId = adminId,
            AdminEmail = adminEmail,
            Resource = resource,
            Action = action,
            CompanyId = companyId,
            PayloadJson = payloadJson,
        });
        await _adminDb.SaveChangesAsync(ct);
    }

    private async Task<string> SaveCompanyLogoAsync(int companyId, string logoBase64, CancellationToken ct)
    {
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

        return Path.Combine("uploads", "companies", companyId.ToString(), fileName).Replace('\\', '/');
    }

    private sealed class AuditChangeVm
    {
        public string Label { get; set; } = "";
        public string Before { get; set; } = "";
        public string After { get; set; } = "";
    }

    private static string SerializeAuditPayload(IReadOnlyList<AuditChangeVm> changes) =>
        JsonSerializer.Serialize(new
        {
            changes = changes.Select(c => new { label = c.Label, before = c.Before, after = c.After }).ToList(),
        });

    private static string TruncateForDisplay(string? s, int max)
    {
        if (string.IsNullOrEmpty(s)) return "";
        return s.Length <= max ? s : s[..max] + "…";
    }

    private async Task<string> ProvinceDisplayAsync(int? provinceId, CancellationToken ct)
    {
        if (provinceId is null or <= 0) return "—";
        var n = await _appDb.FbrProvinces.AsNoTracking()
            .Where(p => p.Id == provinceId.Value)
            .Select(p => p.Provincename)
            .FirstOrDefaultAsync(ct);
        return string.IsNullOrWhiteSpace(n) ? $"#{provinceId}" : n!;
    }

    private static string FormatMoneyDisplay(decimal? amount, string? currency)
    {
        if (amount is null) return "—";
        var cur = string.IsNullOrWhiteSpace(currency) ? "" : $" {currency.Trim()}";
        return $"{amount.Value:0.##}{cur}".Trim();
    }

    private async Task<List<AuditChangeVm>> BuildProfileChangeListAsync(
        string pTitle,
        string pShort,
        string? pEmail,
        string? pPhone,
        string? pWeb,
        string? pNtn,
        int? pEmp,
        bool pEn,
        string? pTs,
        string? pTp,
        int? pPid,
        string oPay,
        string oPm,
        string? oPn,
        decimal? oAm,
        string? oCur,
        Company c,
        CompanyOnboarding o,
        CancellationToken ct)
    {
        var list = new List<AuditChangeVm>();
        void Add(string label, string before, string after)
        {
            if (string.Equals(before, after, StringComparison.Ordinal)) return;
            list.Add(new AuditChangeVm { Label = label, Before = before, After = after });
        }

        void AddTok(string label, string? oldT, string? newT)
        {
            if (string.Equals(oldT?.Trim(), newT?.Trim(), StringComparison.Ordinal)) return;
            var b = string.IsNullOrWhiteSpace(oldT) ? "Empty" : "Set";
            var a = string.IsNullOrWhiteSpace(newT) ? "Cleared" : "Updated";
            Add(label, b, a);
        }

        Add("Company name", pTitle, c.Title);
        Add("Short title", pShort, c.ShortTitle);
        Add("Email", string.IsNullOrWhiteSpace(pEmail) ? "—" : pEmail, string.IsNullOrWhiteSpace(c.Email) ? "—" : c.Email!);
        Add("Phone", string.IsNullOrWhiteSpace(pPhone) ? "—" : pPhone, string.IsNullOrWhiteSpace(c.Phone) ? "—" : c.Phone!);
        Add("Website", string.IsNullOrWhiteSpace(pWeb) ? "—" : pWeb, string.IsNullOrWhiteSpace(c.website) ? "—" : c.website!);
        Add("NTN", string.IsNullOrWhiteSpace(pNtn) ? "—" : pNtn, string.IsNullOrWhiteSpace(c.NTNNo) ? "—" : c.NTNNo!);
        Add("Employees", pEmp?.ToString() ?? "—", c.EmployeeCount?.ToString() ?? "—");
        Add("Sandbox mode", pEn ? "Yes" : "No", c.EnableSandBox ? "Yes" : "No");
        AddTok("Sandbox FBR token", pTs, c.FbrTokenSandBox);
        AddTok("Production FBR token", pTp, c.FbrTokenProduction);

        var bProv = await ProvinceDisplayAsync(pPid, ct);
        var aProv = await ProvinceDisplayAsync(c.FbrProvinceId, ct);
        Add("FBR Province", bProv, aProv);

        Add("Payment status", oPay, o.PaymentStatus);
        Add("Payment model", oPm, o.PaymentModel);
        Add("Payment notes", string.IsNullOrWhiteSpace(oPn) ? "—" : oPn!, string.IsNullOrWhiteSpace(o.PaymentNotes) ? "—" : o.PaymentNotes!);
        Add("Amount", FormatMoneyDisplay(oAm, oCur), FormatMoneyDisplay(o.Amount, o.Currency));

        return list;
    }

    private static List<AuditChangeVm> BuildPaymentChangeList(
        string bPay,
        string bPm,
        string? bPn,
        decimal? bAm,
        string? bCur,
        CompanyOnboarding o)
    {
        var list = new List<AuditChangeVm>();
        void Add(string label, string before, string after)
        {
            if (string.Equals(before, after, StringComparison.Ordinal)) return;
            list.Add(new AuditChangeVm { Label = label, Before = before, After = after });
        }

        Add("Payment status", bPay, o.PaymentStatus);
        Add("Payment model", bPm, o.PaymentModel);
        Add("Payment notes", string.IsNullOrWhiteSpace(bPn) ? "—" : bPn!, string.IsNullOrWhiteSpace(o.PaymentNotes) ? "—" : o.PaymentNotes!);
        Add("Amount", FormatMoneyDisplay(bAm, bCur), FormatMoneyDisplay(o.Amount, o.Currency));
        return list;
    }

    private async Task<List<AuditChangeVm>> BuildTokenChangeListAsync(
        bool bEn,
        int? bPid,
        string? oldSandbox,
        string? oldProduction,
        Company c,
        CancellationToken ct)
    {
        var list = new List<AuditChangeVm>();
        void Add(string label, string before, string after)
        {
            if (string.Equals(before, after, StringComparison.Ordinal)) return;
            list.Add(new AuditChangeVm { Label = label, Before = before, After = after });
        }

        void AddTok(string label, string? oldT, string? newT)
        {
            if (string.Equals(oldT?.Trim(), newT?.Trim(), StringComparison.Ordinal)) return;
            var b = string.IsNullOrWhiteSpace(oldT) ? "Empty" : "Set";
            var a = string.IsNullOrWhiteSpace(newT) ? "Cleared" : "Updated";
            Add(label, b, a);
        }

        Add("Sandbox mode", bEn ? "Yes" : "No", c.EnableSandBox ? "Yes" : "No");
        var bProv = await ProvinceDisplayAsync(bPid, ct);
        var aProv = await ProvinceDisplayAsync(c.FbrProvinceId, ct);
        Add("FBR Province", bProv, aProv);
        AddTok("Sandbox FBR token", oldSandbox, c.FbrTokenSandBox);
        AddTok("Production FBR token", oldProduction, c.FbrTokenProduction);
        return list;
    }

    private static List<object>? DeserializeAttachments(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<List<object>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch
        {
            return null;
        }
    }

    private static bool IsAllowedPaymentStatus(string? s)
    {
        var v = (s ?? "").Trim().ToLowerInvariant();
        return v is "pending" or "confirmed" or "failed" or "waived";
    }

    private static bool IsAllowedPaymentModel(string? s)
    {
        var v = (s ?? "").Trim().ToLowerInvariant();
        return v is "monthly" or "annual" or "custom";
    }

    public sealed class SetPaymentRequest
    {
        public string PaymentStatus { get; set; } = "pending";
        public string PaymentModel { get; set; } = "monthly";
        public string? PaymentNotes { get; set; }
        public decimal? Amount { get; set; }
        public string? Currency { get; set; }
    }

    public sealed class SetFbrTokensRequest
    {
        public bool EnableSandBox { get; set; } = true;
        public string? FbrTokenSandBox { get; set; }
        public string? FbrTokenProduction { get; set; }
        public int? FbrProvinceId { get; set; }
    }

    public sealed class SetActivationRequest
    {
        public bool IsActivated { get; set; }
        public string? Notes { get; set; }
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

    public sealed class AdminCompanyPutRequest
    {
        public string? Title { get; set; }
        public string? ShortTitle { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Website { get; set; }
        public string? NtnNo { get; set; }
        public int? EmployeeCount { get; set; }
        public bool EnableSandBox { get; set; } = true;
        public string? FbrTokenSandBox { get; set; }
        public string? FbrTokenProduction { get; set; }
        public int? FbrProvinceId { get; set; }
        public string? PaymentStatus { get; set; }
        public string? PaymentModel { get; set; }
        public string? PaymentNotes { get; set; }
        public decimal? Amount { get; set; }
        public string? Currency { get; set; }
        public string? LogoBase64 { get; set; }
    }
}

