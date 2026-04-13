using System.Globalization;
using System.Security.Claims;
using System.Text.Json;
using FbrSmartApp.Api.Auth;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using FbrSmartApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/glVoucherTypes")]
[Authorize]
public sealed class GlVoucherTypesController : ControllerBase
{
    private const string ResourceKey = "glVoucherTypes";

    private readonly AppDbContext _db;
    private readonly AppRecordMessageService _recordMessages;

    public GlVoucherTypesController(AppDbContext db, AppRecordMessageService recordMessages)
    {
        _db = db;
        _recordMessages = recordMessages;
    }

    [HttpGet]
    [HasPermission("accounting.glVoucherTypes.read")]
    public async Task<IActionResult> GetList(
        [FromQuery] string? range,
        [FromQuery] string? filter,
        CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var query = _db.GlVoucherTypes.AsNoTracking().Where(x => x.Companyid == companyId);

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
                            (x.Title != null && x.Title.Contains(t)) ||
                            (x.Description != null && x.Description.Contains(t)) ||
                            (x.DocumentPrefix != null && x.DocumentPrefix.Contains(t)));
                    }
                }

                if (doc.RootElement.TryGetProperty("systemType", out var stEl) &&
                    stEl.ValueKind == JsonValueKind.Number &&
                    stEl.TryGetInt32(out var systemType))
                {
                    query = query.Where(x => x.SystemType == systemType);
                }

                if (doc.RootElement.TryGetProperty("status", out var statusFilterEl) &&
                    statusFilterEl.ValueKind == JsonValueKind.String)
                {
                    var sf = statusFilterEl.GetString();
                    if (string.Equals(sf, "active", StringComparison.OrdinalIgnoreCase))
                        query = query.Where(x => x.Status);
                    else if (string.Equals(sf, "inactive", StringComparison.OrdinalIgnoreCase))
                        query = query.Where(x => !x.Status);
                }
            }
            catch (JsonException)
            {
                // ignore
            }
        }

        query = query.OrderBy(x => x.Title ?? "").ThenBy(x => x.Id);

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

        var currencyIds = rows.Select(x => x.CurrencyID).Where(x => x != null).Select(x => x!.Value).Distinct().ToList();
        var currencyLabels = currencyIds.Count == 0
            ? new Dictionary<int, string>()
            : await _db.DataRegisterCurrencies.AsNoTracking()
                .Where(c => currencyIds.Contains(c.Id))
                .ToDictionaryAsync(
                    c => c.Id,
                    c => string.IsNullOrWhiteSpace(c.CurrencySymbol)
                        ? c.CurrencyShortName
                        : $"{c.CurrencySymbol} {c.CurrencyShortName}".Trim(),
                    ct);

        var dtos = rows.Select(x => ToDto(x, currencyLabels)).ToList();

        Response.Headers["Content-Range"] =
            $"glVoucherTypes {from}-{from + Math.Max(dtos.Count - 1, 0)}/{total}";
        return Ok(dtos);
    }

    [HttpGet("{id:int}")]
    [HasPermission("accounting.glVoucherTypes.read")]
    public async Task<IActionResult> GetOne(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var x = await _db.GlVoucherTypes.AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == id && v.Companyid == companyId, ct);
        if (x is null) return NotFound();

        var dict = new Dictionary<int, string>();
        if (x.CurrencyID is int cid)
        {
            var label = await _db.DataRegisterCurrencies.AsNoTracking()
                .Where(c => c.Id == cid)
                .Select(c => string.IsNullOrWhiteSpace(c.CurrencySymbol)
                    ? c.CurrencyShortName
                    : $"{c.CurrencySymbol} {c.CurrencyShortName}".Trim())
                .FirstOrDefaultAsync(ct);
            dict[cid] = label ?? "";
        }

        return Ok(ToDto(x, dict));
    }

    [HttpPost]
    [HasPermission("accounting.glVoucherTypes.create")]
    public async Task<IActionResult> Create([FromBody] GlVoucherTypeWriteDto body, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var user = await GetCurrentUserAsync(ct);

        var prefixErr = NormalizeDocumentPrefix(body.documentPrefix, out var documentPrefix);
        if (prefixErr != null) return BadRequest(new { message = prefixErr });

        var entity = new GlVoucherType
        {
            Title = string.IsNullOrWhiteSpace(body.title) ? null : body.title.Trim(),
            Description = string.IsNullOrWhiteSpace(body.description) ? null : body.description.Trim(),
            DocumentPrefix = documentPrefix,
            Companyid = companyId,
            Status = body.status,
            EntryBy = user?.FullName,
            UserID = null,
            ShowBankAndChequeDate = body.showBankAndChequeDate,
            SystemType = body.systemType,
            ShowToPartyV = body.showToPartyV,
            InterTransferPolicy = body.interTransferPolicy,
            ShowToAccountBook = body.showToAccountBook,
            CurrencyID = body.currencyId,
        };

        if (entity.CurrencyID is int curId &&
            !await _db.DataRegisterCurrencies.AsNoTracking().AnyAsync(c => c.Id == curId, ct))
            return BadRequest(new { message = "Invalid currency." });

        var bad = await ValidateOptionalGlAccountsAsync(
            companyId,
            body.defaultControlGlAccountId,
            body.controlAccountTxnNature,
            body.defaultIncomeGlAccountId,
            ct);
        if (bad != null) return bad;

        entity.DefaultControlGlAccountId = body.defaultControlGlAccountId;
        entity.ControlAccountTxnNature = body.defaultControlGlAccountId is int
            ? body.controlAccountTxnNature
            : null;
        entity.DefaultIncomeGlAccountId = body.defaultIncomeGlAccountId;

        var sigErr = ApplySignatureFields(entity, body);
        if (sigErr != null) return BadRequest(new { message = sigErr });

        _db.GlVoucherTypes.Add(entity);
        await _db.SaveChangesAsync(ct);

        await _recordMessages.AddSystemAsync(
            companyId,
            ResourceKey,
            entity.Id.ToString(CultureInfo.InvariantCulture),
            "Created",
            user?.Id,
            user?.FullName,
            ct,
            $"Voucher type created by {VoucherTypeActorLabel(user)}.");

        return CreatedAtAction(nameof(GetOne), new { id = entity.Id }, ToDto(entity, new Dictionary<int, string>()));
    }

    [HttpPut("{id:int}")]
    [HasPermission("accounting.glVoucherTypes.write")]
    public async Task<IActionResult> Update(int id, [FromBody] GlVoucherTypeWriteDto body, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var user = await GetCurrentUserAsync(ct);

        var entity = await _db.GlVoucherTypes.FirstOrDefaultAsync(v => v.Id == id && v.Companyid == companyId, ct);
        if (entity is null) return NotFound();

        var prefixErrU = NormalizeDocumentPrefix(body.documentPrefix, out var documentPrefixU);
        if (prefixErrU != null) return BadRequest(new { message = prefixErrU });

        entity.Title = string.IsNullOrWhiteSpace(body.title) ? null : body.title.Trim();
        entity.Description = string.IsNullOrWhiteSpace(body.description) ? null : body.description.Trim();
        entity.DocumentPrefix = documentPrefixU;
        entity.Status = body.status;
        entity.EntryBy = user?.FullName;
        entity.UserID = null;
        entity.ShowBankAndChequeDate = body.showBankAndChequeDate;
        entity.SystemType = body.systemType;
        entity.ShowToPartyV = body.showToPartyV;
        entity.InterTransferPolicy = body.interTransferPolicy;
        entity.ShowToAccountBook = body.showToAccountBook;
        entity.CurrencyID = body.currencyId;

        if (entity.CurrencyID is int curId &&
            !await _db.DataRegisterCurrencies.AsNoTracking().AnyAsync(c => c.Id == curId, ct))
            return BadRequest(new { message = "Invalid currency." });

        var bad = await ValidateOptionalGlAccountsAsync(
            companyId,
            body.defaultControlGlAccountId,
            body.controlAccountTxnNature,
            body.defaultIncomeGlAccountId,
            ct);
        if (bad != null) return bad;

        entity.DefaultControlGlAccountId = body.defaultControlGlAccountId;
        entity.ControlAccountTxnNature = body.defaultControlGlAccountId is int
            ? body.controlAccountTxnNature
            : null;
        entity.DefaultIncomeGlAccountId = body.defaultIncomeGlAccountId;

        var sigErrU = ApplySignatureFields(entity, body);
        if (sigErrU != null) return BadRequest(new { message = sigErrU });

        await _db.SaveChangesAsync(ct);

        await _recordMessages.AddSystemAsync(
            companyId,
            ResourceKey,
            entity.Id.ToString(CultureInfo.InvariantCulture),
            "Updated",
            user?.Id,
            user?.FullName,
            ct,
            $"Voucher type updated by {VoucherTypeActorLabel(user)}.");

        var dict = new Dictionary<int, string>();
        if (entity.CurrencyID is int c)
        {
            var sym = await _db.DataRegisterCurrencies.AsNoTracking()
                .Where(x => x.Id == c)
                .Select(x => x.CurrencyShortName)
                .FirstOrDefaultAsync(ct);
            dict[c] = sym ?? "";
        }

        return Ok(ToDto(entity, dict));
    }

    [HttpDelete("{id:int}")]
    [HasPermission("accounting.glVoucherTypes.delete")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var entity = await _db.GlVoucherTypes.FirstOrDefaultAsync(v => v.Id == id && v.Companyid == companyId, ct);
        if (entity is null) return NotFound();
        await _recordMessages.DeleteAllForRecordAsync(companyId, ResourceKey, id.ToString(CultureInfo.InvariantCulture), ct);
        _db.GlVoucherTypes.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Insert standard voucher templates for the current company (only when none exist).</summary>
    [HttpPost("seed-defaults")]
    [HasPermission("accounting.glVoucherTypes.create")]
    public async Task<IActionResult> SeedDefaults(CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var exists = await _db.GlVoucherTypes.AnyAsync(x => x.Companyid == companyId, ct);
        if (exists)
            return Conflict(new { message = "This company already has voucher types. Remove them first or add manually." });

        var pkr = await _db.DataRegisterCurrencies.AsNoTracking()
            .OrderByDescending(x => x.BaseCurrency)
            .ThenBy(x => x.Id)
            .FirstOrDefaultAsync(ct);

        foreach (var (title, systemType, desc) in DefaultTemplates)
        {
            _db.GlVoucherTypes.Add(new GlVoucherType
            {
                Title = title,
                Description = desc,
                Companyid = companyId,
                Status = true,
                EntryBy = "System seed",
                ShowBankAndChequeDate = systemType == VoucherSystemTypeCodes.Bank || systemType == VoucherSystemTypeCodes.Cash,
                SystemType = systemType,
                ShowToPartyV = true,
                InterTransferPolicy = false,
                ShowToAccountBook = true,
                CurrencyID = pkr?.Id,
            });
        }

        await _db.SaveChangesAsync(ct);
        return await GetList(null, null, ct);
    }

    private static GlVoucherTypeDto ToDto(GlVoucherType x, IReadOnlyDictionary<int, string> currencyLabels)
    {
        string? cLabel = null;
        if (x.CurrencyID is int cid && currencyLabels.TryGetValue(cid, out var lab))
            cLabel = lab;

        return new GlVoucherTypeDto
        {
            id = x.Id,
            title = x.Title,
            description = x.Description,
            documentPrefix = x.DocumentPrefix,
            companyid = x.Companyid,
            status = x.Status,
            entryBy = x.EntryBy,
            userID = x.UserID,
            showBankAndChequeDate = x.ShowBankAndChequeDate,
            systemType = x.SystemType,
            showToPartyV = x.ShowToPartyV,
            interTransferPolicy = x.InterTransferPolicy,
            showToAccountBook = x.ShowToAccountBook,
            currencyId = x.CurrencyID,
            currencyLabel = cLabel,
            defaultControlGlAccountId = x.DefaultControlGlAccountId,
            controlAccountTxnNature = x.ControlAccountTxnNature,
            defaultIncomeGlAccountId = x.DefaultIncomeGlAccountId,
            signatureSlotCount = x.SignatureSlotCount,
            signatureName1 = x.SignatureName1,
            signatureName2 = x.SignatureName2,
            signatureName3 = x.SignatureName3,
            signatureName4 = x.SignatureName4,
        };
    }

    /// <summary>Returns error message or null when OK.</summary>
    private static string? ApplySignatureFields(GlVoucherType entity, GlVoucherTypeWriteDto body)
    {
        if (body.signatureSlotCount is not (null or 2 or 3 or 4))
            return "Signature count must be empty, 2, 3, or 4.";

        entity.SignatureSlotCount = body.signatureSlotCount.HasValue
            ? (byte)body.signatureSlotCount.Value
            : null;

        static string? TrimName(string? s) =>
            string.IsNullOrWhiteSpace(s) ? null : s.Trim();

        entity.SignatureName1 = TrimName(body.signatureName1);
        entity.SignatureName2 = TrimName(body.signatureName2);
        entity.SignatureName3 = TrimName(body.signatureName3);
        entity.SignatureName4 = TrimName(body.signatureName4);

        if (entity.SignatureSlotCount is null)
        {
            entity.SignatureName1 = entity.SignatureName2 = entity.SignatureName3 = entity.SignatureName4 = null;
            return null;
        }

        if (entity.SignatureSlotCount == 2)
        {
            entity.SignatureName3 = null;
            entity.SignatureName4 = null;
        }
        else if (entity.SignatureSlotCount == 3)
            entity.SignatureName4 = null;

        return null;
    }

    private static string? NormalizeDocumentPrefix(string? raw, out string? normalized)
    {
        normalized = string.IsNullOrWhiteSpace(raw) ? null : raw.Trim();
        if (normalized != null && normalized.Length > 32)
            return "Document prefix must be at most 32 characters.";
        return null;
    }

    /// <summary>Receivable, Bank and Cash, Prepayments (seed GLAccontType).</summary>
    private static readonly int[] ControlDefaultGlTypeIds = [8, 9, 12];

    /// <summary>Income, Other Income (leaf types under P&amp;L Income).</summary>
    private static readonly int[] IncomeDefaultGlTypeIds = [20, 21];

    private async Task<IActionResult?> ValidateOptionalGlAccountsAsync(
        int companyId,
        int? controlId,
        byte? txnNature,
        int? incomeId,
        CancellationToken ct)
    {
        if (txnNature is not (null or 0 or 1))
            return BadRequest(new { message = "Control account transaction nature must be Debit, Credit, or empty." });
        if (txnNature != null && controlId is null)
            return BadRequest(new { message = "Clear transaction nature when no default control account is set." });

        if (controlId is int cid)
        {
            var err = await ValidateChartAccountTypesAsync(companyId, cid, ControlDefaultGlTypeIds, ct);
            if (err != null) return BadRequest(new { message = err });
        }

        if (incomeId is int iid)
        {
            var err = await ValidateChartAccountTypesAsync(companyId, iid, IncomeDefaultGlTypeIds, ct);
            if (err != null) return BadRequest(new { message = err });
        }

        return null;
    }

    private async Task<string?> ValidateChartAccountTypesAsync(
        int companyId,
        int glcaId,
        int[] allowedGlTypes,
        CancellationToken ct)
    {
        var row = await _db.GlChartOfAccounts.AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == glcaId && a.CompanyId == companyId, ct);
        if (row is null) return "Invalid GL account for this company.";
        if (row.GlType is not int gt || !allowedGlTypes.Contains(gt))
            return "The selected GL account type is not allowed for this field.";
        return null;
    }

    private static readonly (string Title, int SystemType, string? Description)[] DefaultTemplates =
    [
        ("Cash Payment", VoucherSystemTypeCodes.Cash, null),
        ("Bank Payment", VoucherSystemTypeCodes.Bank, null),
        ("Cash Receipt", VoucherSystemTypeCodes.Cash, null),
        ("Bank Receipt", VoucherSystemTypeCodes.Bank, null),
        ("Journal", VoucherSystemTypeCodes.Miscellaneous, null),
        ("Sales Invoice", VoucherSystemTypeCodes.Sales, null),
        ("Purchase Invoice", VoucherSystemTypeCodes.Purchase, null),
    ];

    private static string VoucherTypeActorLabel(User? u)
    {
        if (u is null) return "Unknown user";
        if (!string.IsNullOrWhiteSpace(u.FullName)) return u.FullName.Trim();
        return string.IsNullOrWhiteSpace(u.Username) ? "Unknown user" : u.Username.Trim();
    }

    private int GetCompanyIdOrThrow()
    {
        var raw = User.FindFirstValue("companyId");
        if (!int.TryParse(raw, out var companyId))
            throw new UnauthorizedAccessException("Missing companyId claim.");
        return companyId;
    }

    private async Task<User?> GetCurrentUserAsync(CancellationToken ct)
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        return await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
    }
}

internal static class VoucherSystemTypeCodes
{
    public const int Sales = 0;
    public const int Purchase = 1;
    public const int Cash = 2;
    public const int Bank = 3;
    public const int CreditCard = 4;
    public const int Miscellaneous = 5;
}

public sealed class GlVoucherTypeDto
{
    public int id { get; set; }
    public string? title { get; set; }
    public string? description { get; set; }
    public string? documentPrefix { get; set; }
    public int? companyid { get; set; }
    public bool status { get; set; }
    public string? entryBy { get; set; }
    public int? userID { get; set; }
    public bool showBankAndChequeDate { get; set; }
    public int systemType { get; set; }
    public bool showToPartyV { get; set; }
    public bool interTransferPolicy { get; set; }
    public bool showToAccountBook { get; set; }
    public int? currencyId { get; set; }
    public string? currencyLabel { get; set; }
    public int? defaultControlGlAccountId { get; set; }
    public byte? controlAccountTxnNature { get; set; }
    public int? defaultIncomeGlAccountId { get; set; }
    public byte? signatureSlotCount { get; set; }
    public string? signatureName1 { get; set; }
    public string? signatureName2 { get; set; }
    public string? signatureName3 { get; set; }
    public string? signatureName4 { get; set; }
}

public sealed class GlVoucherTypeWriteDto
{
    public string? title { get; set; }
    public string? description { get; set; }
    public string? documentPrefix { get; set; }
    public bool status { get; set; } = true;
    public bool showBankAndChequeDate { get; set; }
    public int systemType { get; set; }
    public bool showToPartyV { get; set; }
    public bool interTransferPolicy { get; set; }
    public bool showToAccountBook { get; set; }
    public int? currencyId { get; set; }
    public int? defaultControlGlAccountId { get; set; }
    public byte? controlAccountTxnNature { get; set; }
    public int? defaultIncomeGlAccountId { get; set; }
    public byte? signatureSlotCount { get; set; }
    public string? signatureName1 { get; set; }
    public string? signatureName2 { get; set; }
    public string? signatureName3 { get; set; }
    public string? signatureName4 { get; set; }
}
