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
[Route("api/glJournalVouchers")]
[Authorize]
public sealed class GlJournalVouchersController : ControllerBase
{
    private const string ResourceKey = "glJournalVouchers";

    private const int VoucherSystemTypeCash = 2;
    private const int VoucherSystemTypeBank = 3;
    private const int VoucherSystemTypeMiscellaneous = 5;

    private readonly AppDbContext _db;
    private readonly AppRecordMessageService _recordMessages;

    public GlJournalVouchersController(AppDbContext db, AppRecordMessageService recordMessages)
    {
        _db = db;
        _recordMessages = recordMessages;
    }

    [HttpGet]
    [HasPermission("accounting.glJournalVouchers.read")]
    public async Task<IActionResult> GetList(
        [FromQuery] string? range,
        [FromQuery] string? filter,
        CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();

        string? qFilter = null;
        bool? postedFilter = null;
        int? systemTypeFilter = null;
        string? approvalStatusCodeFilter = null;

        if (!string.IsNullOrWhiteSpace(filter))
        {
            try
            {
                using var doc = JsonDocument.Parse(filter);
                var root = doc.RootElement;
                if (root.TryGetProperty("q", out var qEl))
                    qFilter = qEl.GetString();
                if (root.TryGetProperty("posted", out var pEl))
                {
                    if (pEl.ValueKind == JsonValueKind.True) postedFilter = true;
                    else if (pEl.ValueKind == JsonValueKind.False) postedFilter = false;
                }
                if (root.TryGetProperty("systemType", out var stEl) && stEl.TryGetInt32(out var st))
                    systemTypeFilter = st;
                if (root.TryGetProperty("approvalStatus", out var apEl))
                    approvalStatusCodeFilter = apEl.GetString()?.Trim();
            }
            catch (JsonException)
            {
                // ignore malformed filter JSON
            }
        }

        int? approvalIdFilter = null;
        if (!string.IsNullOrWhiteSpace(approvalStatusCodeFilter))
        {
            var code = approvalStatusCodeFilter!;
            approvalIdFilter = await _db.ApprovalStatuses.AsNoTracking()
                .Where(a => a.Code == code)
                .Select(a => (int?)a.Id)
                .FirstOrDefaultAsync(ct);
        }

        var query = _db.GlVoucherMains.AsNoTracking()
            .Where(x => x.CompanyId == companyId)
            .Join(
                _db.GlVoucherTypes.AsNoTracking(),
                m => m.VoucherTypeId,
                t => t.Id,
                (m, t) => new { Main = m, JournalTitle = t.Title, SystemType = t.SystemType });

        if (!string.IsNullOrWhiteSpace(qFilter))
        {
            var t = qFilter.Trim();
            query = query.Where(x =>
                (x.Main.VoucherNo != null && x.Main.VoucherNo.Contains(t)) ||
                (x.Main.ManualNo != null && x.Main.ManualNo.Contains(t)) ||
                (x.Main.Remarks != null && x.Main.Remarks.Contains(t)) ||
                (x.JournalTitle != null && x.JournalTitle.Contains(t)));
        }

        if (postedFilter.HasValue)
            query = query.Where(x => x.Main.Posted == postedFilter.Value);

        if (systemTypeFilter.HasValue)
            query = query.Where(x => x.SystemType == systemTypeFilter.Value);

        if (!string.IsNullOrWhiteSpace(approvalStatusCodeFilter))
        {
            if (approvalIdFilter.HasValue)
                query = query.Where(x => x.Main.ApprovalStatusId == approvalIdFilter.Value);
            else
                query = query.Where(x => false);
        }

        query = query.OrderByDescending(x => x.Main.VoucherDate).ThenByDescending(x => x.Main.Id);

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
        var page = await query.Skip(from).Take(take).ToListAsync(ct);

        var approvalIds = page
            .Select(x => x.Main.ApprovalStatusId)
            .Where(x => x != null)
            .Select(x => x!.Value)
            .Distinct()
            .ToList();
        var approvalCodes = approvalIds.Count == 0
            ? new Dictionary<int, string>()
            : await _db.ApprovalStatuses.AsNoTracking()
                .Where(a => approvalIds.Contains(a.Id))
                .ToDictionaryAsync(a => a.Id, a => a.Code, ct);

        var rows = page.Select(x => new GlJournalVoucherListDto
        {
            id = x.Main.Id,
            voucherNo = x.Main.VoucherNo,
            voucherDate = x.Main.VoucherDate,
            journalTitle = x.JournalTitle,
            posted = x.Main.Posted,
            totalDr = x.Main.TotalDr,
            totalCr = x.Main.TotalCr,
            readOnly = x.Main.ReadOnly,
            approvalStatusCode = x.Main.ApprovalStatusId is int aid && approvalCodes.TryGetValue(aid, out var c)
                ? c
                : "draft",
        }).ToList();

        Response.Headers.ContentRange = $"glJournalVouchers {from}-{from + Math.Max(rows.Count - 1, 0)}/{total}";
        Response.Headers.AccessControlExposeHeaders = "Content-Range";
        return Ok(rows);
    }

    [HttpGet("{id:int}")]
    [HasPermission("accounting.glJournalVouchers.read")]
    public async Task<IActionResult> GetOne(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var m = await _db.GlVoucherMains.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (m is null) return NotFound();

        var vtMeta = await _db.GlVoucherTypes.AsNoTracking()
            .Where(t => t.Id == m.VoucherTypeId)
            .Select(t => new
            {
                t.Title,
                t.SystemType,
                t.ControlAccountTxnNature,
                t.ShowBankAndChequeDate,
            })
            .FirstOrDefaultAsync(ct);

        var lines = await _db.GlVoucherDetails.AsNoTracking()
            .Where(d => d.VoucherMainId == id)
            .OrderBy(d => d.Id)
            .ToListAsync(ct);

        var glIds = lines.Select(x => x.GlAccountId).Distinct().ToList();
        var glLabels = glIds.Count == 0
            ? new Dictionary<int, string>()
            : await _db.GlChartOfAccounts.AsNoTracking()
                .Where(a => glIds.Contains(a.Id))
                .ToDictionaryAsync(
                    a => a.Id,
                    a => $"{(a.GlCode ?? "").Trim()} {(a.GlTitle ?? "").Trim()}".Trim(),
                    ct);

        var taxIds = lines
            .SelectMany(d => ParseJournalLineTaxIds(d))
            .Where(x => x > 0)
            .Distinct()
            .ToList();
        var taxLabels = taxIds.Count == 0
            ? new Dictionary<int, string>()
            : await _db.FbrSalesTaxRates.AsNoTracking()
                .Where(t => taxIds.Contains(t.Id) && t.CompanyId == companyId)
                .ToDictionaryAsync(t => t.Id, t => (t.LabelOnInvoices ?? t.Label ?? "").Trim(), ct);

        var partyIds = lines.Select(x => x.PartyId).Where(x => x is > 0).Select(x => x!.Value).Distinct().ToList();
        var partyLabels = partyIds.Count == 0
            ? new Dictionary<int, string>()
            : await _db.Customers.AsNoTracking()
                .Where(p => partyIds.Contains(p.Id) && (p.CompanyID ?? 0) == companyId)
                .ToDictionaryAsync(
                    p => p.Id,
                    p => (p.PartyName ?? p.PartyBusinessName ?? "").Trim(),
                    ct);

        string approvalCode = "draft";
        string? approvalName = null;
        if (m.ApprovalStatusId is int asid)
        {
            var ap = await _db.ApprovalStatuses.AsNoTracking()
                .Where(a => a.Id == asid)
                .Select(a => new { a.Code, a.Name })
                .FirstOrDefaultAsync(ct);
            if (ap != null)
            {
                approvalCode = ap.Code;
                approvalName = ap.Name;
            }
        }

        var dto = new GlJournalVoucherDetailDto
        {
            id = m.Id,
            voucherTypeId = m.VoucherTypeId,
            voucherNo = m.VoucherNo,
            voucherDate = m.VoucherDate,
            remarks = m.Remarks,
            manualNo = m.ManualNo,
            branchId = m.BranchId,
            bankCashGlAccountId = m.BankCashGlAccountId,
            chequeNo = m.ChequeNo,
            chequeDate = m.ChequeDate,
            voucherSystemType = vtMeta?.SystemType ?? 0,
            controlAccountTxnNature = vtMeta?.ControlAccountTxnNature,
            showBankAndChequeDate = vtMeta?.ShowBankAndChequeDate ?? false,
            posted = m.Posted,
            cancelled = m.Cancelled,
            readOnly = m.ReadOnly,
            approvalStatusId = m.ApprovalStatusId,
            approvalStatusCode = approvalCode,
            approvalStatusName = approvalName,
            totalDr = m.TotalDr,
            totalCr = m.TotalCr,
            journalTitle = vtMeta?.Title,
            enteredAtUtc = m.EnteredAtUtc,
            postedAtUtc = m.PostedAtUtc,
            lines = lines.Select(d =>
            {
                var tids = ParseJournalLineTaxIds(d);
                var lbls = tids.Select(id => taxLabels.GetValueOrDefault(id) ?? $"#{id}").ToList();
                return new GlJournalVoucherLineDto
                {
                    id = d.Id,
                    glAccountId = d.GlAccountId,
                    glAccountLabel = glLabels.GetValueOrDefault(d.GlAccountId),
                    narration = d.Narration,
                    dr = d.Dr,
                    cr = d.Cr,
                    taxAmount = d.TaxAmount,
                    partnerRef = d.PartnerRef,
                    fbrSalesTaxRateIds = tids,
                    fbrSalesTaxRateLabels = lbls,
                    fbrSalesTaxRateId = tids.Count > 0 ? tids[0] : null,
                    fbrSalesTaxRateLabel = tids.Count > 0 ? lbls[0] : null,
                    partyId = d.PartyId,
                    partyLabel = d.PartyId is int pid && partyLabels.TryGetValue(pid, out var pl) ? pl : null,
                };
            }).ToList(),
        };

        return Ok(dto);
    }

    /// <summary>Next unused cheque number from the active cheque book when validation is enabled on the bank.</summary>
    [HttpGet("next-cheque-number")]
    [HasPermission("accounting.glJournalVouchers.read")]
    public async Task<IActionResult> GetNextChequeNumber([FromQuery] int bankCashGlAccountId, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        if (bankCashGlAccountId <= 0)
            return BadRequest(new { message = "bankCashGlAccountId is required." });
        var svc = new ChequeBookService(_db);
        var next = await svc.GetNextSuggestedChequeNoAsync(companyId, bankCashGlAccountId, ct);
        return Ok(new { suggestedChequeNo = next });
    }

    [HttpPost]
    [HasPermission("accounting.glJournalVouchers.create")]
    public async Task<IActionResult> Create([FromBody] GlJournalVoucherWriteDto body, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var user = await GetCurrentUserAsync(ct);
        var err = await ValidateWriteAsync(companyId, body, ct, excludeVoucherId: null);
        if (err != null) return err;

        var vtRow = await _db.GlVoucherTypes.AsNoTracking()
            .FirstAsync(x => x.Id == body.voucherTypeId && x.Companyid == companyId, ct);

        var vNo = await GenerateNextVoucherNoAsync(companyId, body.voucherTypeId, body.voucherDate, ct);
        var (totalDr, totalCr) = SumLines(body.lines);
        var draftStatusId = await GetApprovalStatusIdByCodeAsync("draft", ct);

        var entity = new GlVoucherMain
        {
            VoucherTypeId = body.voucherTypeId,
            VoucherNo = vNo,
            VoucherDate = body.voucherDate.Date,
            Remarks = string.IsNullOrWhiteSpace(body.remarks) ? null : body.remarks.Trim(),
            ManualNo = string.IsNullOrWhiteSpace(body.manualNo) ? null : body.manualNo.Trim(),
            CompanyId = companyId,
            BranchId = body.branchId,
            Cancelled = false,
            Posted = false,
            EnteredAtUtc = DateTime.UtcNow,
            TotalDr = totalDr,
            TotalCr = totalCr,
            ReadOnly = false,
            ApprovalStatusId = draftStatusId,
            BankCashGlAccountId = BankCashIdForPersist(vtRow.SystemType, body.bankCashGlAccountId),
            ChequeNo = string.IsNullOrWhiteSpace(body.chequeNo) ? null : body.chequeNo.Trim(),
            ChequeDate = body.chequeDate?.Date,
        };

        _db.GlVoucherMains.Add(entity);
        await _db.SaveChangesAsync(ct);

        await ReplaceDetailsAsync(companyId, entity.Id, body.lines, ct);
        await _db.SaveChangesAsync(ct);

        await _recordMessages.AddSystemAsync(
            companyId,
            ResourceKey,
            entity.Id.ToString(CultureInfo.InvariantCulture),
            "Created",
            user?.Id,
            user?.FullName,
            ct,
            $"Journal voucher created by {ActorLabel(user)}.");

        var created = await GetOne(entity.Id, ct);
        if (created is OkObjectResult ok && ok.Value != null)
            return CreatedAtAction(nameof(GetOne), new { id = entity.Id }, ok.Value);
        return created;
    }

    [HttpPut("{id:int}")]
    [HasPermission("accounting.glJournalVouchers.write")]
    public async Task<IActionResult> Update(int id, [FromBody] GlJournalVoucherWriteDto body, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var user = await GetCurrentUserAsync(ct);

        var entity = await _db.GlVoucherMains.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (entity is null) return NotFound();
        if (entity.ReadOnly || entity.Posted || entity.Cancelled)
            return BadRequest(new { message = "This voucher cannot be edited." });
        var st = await GetApprovalStatusCodeAsync(entity.ApprovalStatusId, ct);
        if (string.Equals(st, "deleted", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "This voucher cannot be edited." });

        var err = await ValidateWriteAsync(companyId, body, ct, excludeVoucherId: id);
        if (err != null) return err;

        entity.VoucherTypeId = body.voucherTypeId;
        entity.VoucherDate = body.voucherDate.Date;
        entity.Remarks = string.IsNullOrWhiteSpace(body.remarks) ? null : body.remarks.Trim();
        entity.ManualNo = string.IsNullOrWhiteSpace(body.manualNo) ? null : body.manualNo.Trim();
        entity.BranchId = body.branchId;
        var (totalDr, totalCr) = SumLines(body.lines);
        entity.TotalDr = totalDr;
        entity.TotalCr = totalCr;
        var vtForPersist = await _db.GlVoucherTypes.AsNoTracking()
            .FirstAsync(x => x.Id == body.voucherTypeId && x.Companyid == companyId, ct);
        entity.BankCashGlAccountId = BankCashIdForPersist(vtForPersist.SystemType, body.bankCashGlAccountId);
        entity.ChequeNo = string.IsNullOrWhiteSpace(body.chequeNo) ? null : body.chequeNo.Trim();
        entity.ChequeDate = body.chequeDate?.Date;

        await ReplaceDetailsAsync(companyId, id, body.lines, ct);
        await _db.SaveChangesAsync(ct);

        await _recordMessages.AddSystemAsync(
            companyId,
            ResourceKey,
            id.ToString(CultureInfo.InvariantCulture),
            "Updated",
            user?.Id,
            user?.FullName,
            ct,
            $"Journal voucher updated by {ActorLabel(user)}.");

        return await GetOne(id, ct);
    }

    [HttpPost("{id:int}/post")]
    [HasPermission("accounting.glJournalVouchers.write")]
    public async Task<IActionResult> PostVoucher(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var entity = await _db.GlVoucherMains
            .Include(x => x.Details)
            .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (entity is null) return NotFound();
        if (entity.Posted)
            return BadRequest(new { message = "Voucher is already posted." });
        if (entity.Cancelled)
            return BadRequest(new { message = "Cancelled vouchers cannot be posted." });

        var st = await GetApprovalStatusCodeAsync(entity.ApprovalStatusId, ct);
        if (!string.Equals(st, "confirmed", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Confirm the voucher before posting." });

        var (dr, cr) = SumDetails(entity.Details);
        if (!IsBalanced(dr, cr))
            return BadRequest(new { message = "Debit and credit totals must match before posting." });
        if (entity.Details.Count == 0)
            return BadRequest(new { message = "Add at least one line before posting." });

        var postedId = await GetApprovalStatusIdByCodeAsync("posted", ct);
        entity.Posted = true;
        entity.PostedByUserId = user.Id;
        entity.PostedAtUtc = DateTime.UtcNow;
        entity.ReadOnly = true;
        entity.ApprovalStatusId = postedId;
        entity.TotalDr = dr;
        entity.TotalCr = cr;

        await _db.SaveChangesAsync(ct);

        await _recordMessages.AddSystemAsync(
            companyId,
            ResourceKey,
            id.ToString(CultureInfo.InvariantCulture),
            "Posted",
            user.Id,
            user.FullName,
            ct,
            $"Voucher posted to the ledger by {ActorLabel(user)}.");

        return await GetOne(id, ct);
    }

    [HttpDelete("{id:int}")]
    [HasPermission("accounting.glJournalVouchers.delete")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var entity = await _db.GlVoucherMains.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (entity is null) return NotFound();
        if (entity.Posted)
            return BadRequest(new { message = "Posted vouchers cannot be deleted." });
        if (entity.Cancelled)
            return BadRequest(new { message = "Cancelled vouchers cannot be deleted." });

        _db.GlVoucherMains.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id:int}/approve")]
    [HasPermission("accounting.glJournalVouchers.write")]
    public async Task<IActionResult> Approve(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var entity = await _db.GlVoucherMains.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (entity is null) return NotFound();
        if (entity.Posted || entity.Cancelled)
            return BadRequest(new { message = "This voucher cannot be approved." });
        var st = await GetApprovalStatusCodeAsync(entity.ApprovalStatusId, ct);
        if (!string.Equals(st, "draft", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Only draft vouchers can be approved." });

        entity.ApprovalStatusId = await GetApprovalStatusIdByCodeAsync("approved", ct);
        await _db.SaveChangesAsync(ct);

        await _recordMessages.AddSystemAsync(
            companyId,
            ResourceKey,
            id.ToString(CultureInfo.InvariantCulture),
            "Approved",
            user.Id,
            user.FullName,
            ct,
            $"Voucher approved by {ActorLabel(user)}.");

        return await GetOne(id, ct);
    }

    [HttpPost("{id:int}/confirm")]
    [HasPermission("accounting.glJournalVouchers.write")]
    public async Task<IActionResult> Confirm(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var entity = await _db.GlVoucherMains.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (entity is null) return NotFound();
        if (entity.Posted || entity.Cancelled)
            return BadRequest(new { message = "This voucher cannot be confirmed." });
        var st = await GetApprovalStatusCodeAsync(entity.ApprovalStatusId, ct);
        if (!string.Equals(st, "approved", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Approve the voucher before confirming." });

        entity.ApprovalStatusId = await GetApprovalStatusIdByCodeAsync("confirmed", ct);
        await _db.SaveChangesAsync(ct);

        await _recordMessages.AddSystemAsync(
            companyId,
            ResourceKey,
            id.ToString(CultureInfo.InvariantCulture),
            "Confirmed",
            user.Id,
            user.FullName,
            ct,
            $"Voucher confirmed by {ActorLabel(user)}.");

        return await GetOne(id, ct);
    }

    public sealed class SetApprovalStatusDto
    {
        public string? code { get; set; }
    }

    /// <summary>
    /// Set approval status directly (used to reset workflow backwards).
    /// Allowed codes: draft, approved, confirmed.
    /// </summary>
    [HttpPost("{id:int}/set-approval-status")]
    [HasPermission("accounting.glJournalVouchers.write")]
    public async Task<IActionResult> SetApprovalStatus(int id, [FromBody] SetApprovalStatusDto body, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var nextCode = (body.code ?? "").Trim().ToLowerInvariant();
        if (nextCode is not ("draft" or "approved" or "confirmed"))
            return BadRequest(new { message = "Invalid status. Allowed: draft, approved, confirmed." });

        var entity = await _db.GlVoucherMains.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (entity is null) return NotFound();
        if (entity.Cancelled)
            return BadRequest(new { message = "Voided vouchers cannot be reset." });

        var currentCode = await GetApprovalStatusCodeAsync(entity.ApprovalStatusId, ct);
        if (string.Equals(currentCode, "deleted", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "This voucher cannot be reset." });

        // Posted vouchers are read-only; allow resetting only for Admin or users with delete permission.
        if (entity.Posted || entity.ReadOnly)
        {
            var canUnpost =
                User.IsInRole("Admin") ||
                User.HasClaim(PermissionCatalog.ClaimPermission, "accounting.glJournalVouchers.delete");
            if (!canUnpost)
                return BadRequest(new { message = "You are not allowed to reset a posted voucher." });
        }

        // No-op: already at desired status
        if (string.Equals(currentCode, nextCode, StringComparison.OrdinalIgnoreCase))
            return await GetOne(id, ct);

        entity.ApprovalStatusId = await GetApprovalStatusIdByCodeAsync(nextCode, ct);
        if (entity.Posted)
        {
            // Unpost: move back into editable workflow.
            entity.Posted = false;
            entity.ReadOnly = false;
            entity.PostedAtUtc = null;
            entity.PostedByUserId = null;
        }
        await _db.SaveChangesAsync(ct);

        await _recordMessages.AddSystemAsync(
            companyId,
            ResourceKey,
            id.ToString(CultureInfo.InvariantCulture),
            "StatusChanged",
            user.Id,
            user.FullName,
            ct,
            $"Voucher status changed from {currentCode} to {nextCode} by {ActorLabel(user)}.");

        return await GetOne(id, ct);
    }

    [HttpPost("{id:int}/void")]
    [HasPermission("accounting.glJournalVouchers.write")]
    public async Task<IActionResult> VoidVoucher(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var entity = await _db.GlVoucherMains.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (entity is null) return NotFound();
        if (entity.Posted)
            return BadRequest(new { message = "Posted vouchers cannot be voided." });
        if (entity.Cancelled)
            return BadRequest(new { message = "Voucher is already voided." });

        entity.Cancelled = true;
        entity.ReadOnly = true;
        entity.ApprovalStatusId = await GetApprovalStatusIdByCodeAsync("deleted", ct);
        await _db.SaveChangesAsync(ct);

        await _recordMessages.AddSystemAsync(
            companyId,
            ResourceKey,
            id.ToString(CultureInfo.InvariantCulture),
            "Voided",
            user.Id,
            user.FullName,
            ct,
            $"Voucher voided by {ActorLabel(user)}.");

        return await GetOne(id, ct);
    }

    private static string ActorLabel(User? u)
    {
        if (u is null) return "Unknown user";
        if (!string.IsNullOrWhiteSpace(u.FullName)) return u.FullName.Trim();
        return string.IsNullOrWhiteSpace(u.Username) ? "Unknown user" : u.Username.Trim();
    }

    private async Task<int> GetApprovalStatusIdByCodeAsync(string code, CancellationToken ct) =>
        await _db.ApprovalStatuses.AsNoTracking()
            .Where(x => x.Code == code)
            .Select(x => x.Id)
            .FirstAsync(ct);

    private async Task<string> GetApprovalStatusCodeAsync(int? approvalStatusId, CancellationToken ct)
    {
        if (approvalStatusId is not int id) return "draft";
        var code = await _db.ApprovalStatuses.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => x.Code)
            .FirstOrDefaultAsync(ct);
        return string.IsNullOrEmpty(code) ? "draft" : code;
    }

    private static (decimal Dr, decimal Cr) SumLines(IReadOnlyList<GlJournalVoucherLineWriteDto>? lines)
    {
        if (lines is null || lines.Count == 0) return (0, 0);
        var dr = lines.Sum(x => x.dr);
        var cr = lines.Sum(x => x.cr);
        return (RoundMoney(dr), RoundMoney(cr));
    }

    private static (decimal Dr, decimal Cr) SumDetails(IEnumerable<GlVoucherDetail> lines)
    {
        var dr = lines.Sum(x => x.Dr);
        var cr = lines.Sum(x => x.Cr);
        return (RoundMoney(dr), RoundMoney(cr));
    }

    private static decimal RoundMoney(decimal v) => Math.Round(v, 3, MidpointRounding.AwayFromZero);

    private static bool IsBalanced(decimal dr, decimal cr) => Math.Abs(dr - cr) < 0.0005m;

    private async Task ReplaceDetailsAsync(int companyId, int voucherMainId, IReadOnlyList<GlJournalVoucherLineWriteDto>? lines, CancellationToken ct)
    {
        var existing = await _db.GlVoucherDetails.Where(d => d.VoucherMainId == voucherMainId).ToListAsync(ct);
        _db.GlVoucherDetails.RemoveRange(existing);

        if (lines is null) return;

        var taxIds = lines
            .SelectMany(x => x.fbrSalesTaxRateIds ?? [])
            .Where(id => id > 0)
            .Distinct()
            .ToList();
        var taxRates = taxIds.Count == 0
            ? new Dictionary<int, decimal>()
            : await _db.FbrSalesTaxRates.AsNoTracking()
                .Where(t => taxIds.Contains(t.Id) && t.CompanyId == companyId)
                .ToDictionaryAsync(t => t.Id, t => t.Percentage, ct);

        foreach (var line in lines)
        {
            var dr = RoundMoney(line.dr);
            var cr = RoundMoney(line.cr);
            var baseAmt = Math.Max(dr, cr);
            var rateIdList = line.fbrSalesTaxRateIds?.Where(x => x > 0).Distinct().ToList() ?? [];
            decimal? taxAmt = null;
            string? json = null;
            int? firstTid = null;
            if (rateIdList.Count > 0)
            {
                json = JsonSerializer.Serialize(rateIdList);
                firstTid = rateIdList[0];
                decimal sum = 0;
                foreach (var rid in rateIdList)
                {
                    if (taxRates.TryGetValue(rid, out var pct))
                        sum += baseAmt * pct;
                }
                taxAmt = RoundMoney(sum);
            }

            _db.GlVoucherDetails.Add(new GlVoucherDetail
            {
                VoucherMainId = voucherMainId,
                GlAccountId = line.glAccountId,
                Dr = dr,
                Cr = cr,
                Narration = string.IsNullOrWhiteSpace(line.narration) ? null : line.narration.Trim(),
                ShowToParty = false,
                PrBookNo = 0,
                TaxAmount = taxAmt,
                PartnerRef = null,
                FbrSalesTaxRateIdsJson = json,
                FbrSalesTaxRateId = firstTid,
                PartyId = line.partyId is > 0 ? line.partyId : null,
            });
        }

        await _db.SaveChangesAsync(ct);
    }

    private static List<int> ParseJournalLineTaxIds(GlVoucherDetail d)
    {
        if (!string.IsNullOrWhiteSpace(d.FbrSalesTaxRateIdsJson))
        {
            try
            {
                var list = JsonSerializer.Deserialize<List<int>>(d.FbrSalesTaxRateIdsJson);
                if (list is { Count: > 0 })
                    return list.Where(x => x > 0).Distinct().ToList();
            }
            catch (JsonException)
            {
                /* ignore */
            }
        }

        if (d.FbrSalesTaxRateId is int sid && sid > 0)
            return [sid];
        return [];
    }

    private async Task<IActionResult?> ValidateWriteAsync(
        int companyId,
        GlJournalVoucherWriteDto body,
        CancellationToken ct,
        int? excludeVoucherId)
    {
        var vt = await _db.GlVoucherTypes.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == body.voucherTypeId && x.Companyid == companyId, ct);
        if (vt is null) return BadRequest(new { message = "Invalid journal (voucher type)." });
        if (vt.SystemType != VoucherSystemTypeMiscellaneous &&
            vt.SystemType != VoucherSystemTypeCash &&
            vt.SystemType != VoucherSystemTypeBank)
            return BadRequest(new { message = "This voucher type is not supported." });

        var bankErr = await ValidateBankCashGlAccountAsync(companyId, vt.SystemType, body.bankCashGlAccountId, ct);
        if (bankErr != null) return bankErr;

        var chequeErr = await ValidateChequeBookForBankPaymentIfNeededAsync(
            companyId,
            vt,
            body.bankCashGlAccountId,
            body.chequeNo,
            excludeVoucherId,
            ct);
        if (chequeErr != null) return chequeErr;

        if (body.lines is null || body.lines.Count == 0)
            return BadRequest(new { message = "Add at least one line." });

        var glIds = body.lines.Select(x => x.glAccountId).Distinct().ToList();
        var validCount = await _db.GlChartOfAccounts.AsNoTracking()
            .CountAsync(a => glIds.Contains(a.Id) && a.CompanyId == companyId, ct);
        if (validCount != glIds.Count)
            return BadRequest(new { message = "One or more GL accounts are invalid for this company." });

        foreach (var line in body.lines)
        {
            if (line.dr < 0 || line.cr < 0)
                return BadRequest(new { message = "Debit and credit amounts cannot be negative." });
            if (line.dr > 0 && line.cr > 0)
                return BadRequest(new { message = "Enter either debit or credit per line, not both." });
        }

        var lineTaxIds = body.lines
            .SelectMany(x => x.fbrSalesTaxRateIds ?? [])
            .Where(id => id > 0)
            .Distinct()
            .ToList();
        if (lineTaxIds.Count > 0)
        {
            var n = await _db.FbrSalesTaxRates.AsNoTracking()
                .CountAsync(t => lineTaxIds.Contains(t.Id) && t.CompanyId == companyId, ct);
            if (n != lineTaxIds.Count)
                return BadRequest(new { message = "One or more tax rates are invalid for this company." });
        }

        var linePartyIds = body.lines.Where(x => x.partyId is > 0).Select(x => x.partyId!.Value).Distinct().ToList();
        if (linePartyIds.Count > 0)
        {
            var n = await _db.Customers.AsNoTracking()
                .CountAsync(p => linePartyIds.Contains(p.Id) && (p.CompanyID ?? 0) == companyId, ct);
            if (n != linePartyIds.Count)
                return BadRequest(new { message = "One or more parties are invalid for this company." });
        }

        return null;
    }

    /// <summary>Bank payment vouchers (bank system type, control credit) may require cheque numbers per bank settings.</summary>
    private async Task<IActionResult?> ValidateChequeBookForBankPaymentIfNeededAsync(
        int companyId,
        GlVoucherType vt,
        int? bankCashGlAccountId,
        string? chequeNo,
        int? excludeVoucherId,
        CancellationToken ct)
    {
        if (vt.SystemType != VoucherSystemTypeBank)
            return null;
        if (vt.ControlAccountTxnNature is not byte nature || nature != 1)
            return null;
        if (bankCashGlAccountId is null or <= 0)
            return null;

        var svc = new ChequeBookService(_db);
        var (ok, err) = await svc.ValidateBankPaymentChequeAsync(
            companyId,
            bankCashGlAccountId.Value,
            chequeNo,
            excludeVoucherId,
            ct);
        if (!ok)
            return BadRequest(new { message = err });
        return null;
    }

    private async Task<string> GenerateNextVoucherNoAsync(int companyId, int voucherTypeId, DateTime voucherDate, CancellationToken ct)
    {
        var vt = await _db.GlVoucherTypes.AsNoTracking()
            .FirstAsync(x => x.Id == voucherTypeId && x.Companyid == companyId, ct);
        var prefix = string.IsNullOrWhiteSpace(vt.DocumentPrefix) ? "JV" : vt.DocumentPrefix.Trim();
        var y = voucherDate.Year;
        var mo = voucherDate.Month;
        var key = $"{prefix}/{y}/{mo:D2}/";
        var existing = await _db.GlVoucherMains.AsNoTracking()
            .Where(x => x.CompanyId == companyId && x.VoucherTypeId == voucherTypeId && x.VoucherNo != null && x.VoucherNo.StartsWith(key))
            .Select(x => x.VoucherNo!)
            .ToListAsync(ct);

        var max = 0;
        foreach (var n in existing)
        {
            var parts = n.Split('/');
            if (parts.Length < 4) continue;
            if (int.TryParse(parts[^1], NumberStyles.Integer, CultureInfo.InvariantCulture, out var seq))
                max = Math.Max(max, seq);
        }

        return $"{prefix}/{y}/{mo:D2}/{(max + 1):D4}";
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

    private static int? BankCashIdForPersist(int systemType, int? bankCashGlAccountId)
    {
        if (systemType != VoucherSystemTypeCash && systemType != VoucherSystemTypeBank)
            return null;
        return bankCashGlAccountId is > 0 ? bankCashGlAccountId : null;
    }

    private async Task<IActionResult?> ValidateBankCashGlAccountAsync(
        int companyId,
        int systemType,
        int? bankCashGlAccountId,
        CancellationToken ct)
    {
        if (bankCashGlAccountId is null or <= 0)
            return null;

        var glOk = await _db.GlChartOfAccounts.AsNoTracking()
            .AnyAsync(a => a.Id == bankCashGlAccountId.Value && a.CompanyId == companyId, ct);
        if (!glOk)
            return BadRequest(new { message = "Bank/cash GL account is invalid for this company." });

        if (systemType == VoucherSystemTypeBank)
        {
            var ok = await _db.GenBankInformations.AsNoTracking()
                .AnyAsync(b => b.CompanyId == companyId && b.GlcaId == bankCashGlAccountId, ct);
            if (!ok)
                return BadRequest(new { message = "Select a bank account registered under Bank information." });
        }
        else if (systemType == VoucherSystemTypeCash)
        {
            var cash = await _db.GenCashInformations.AsNoTracking()
                .FirstOrDefaultAsync(b => b.CompanyId == companyId && b.CashAccount == bankCashGlAccountId, ct);
            // Allow saving even when the cash GL isn't registered in Cash information.
            // (Default control account is used to ease user workflow.)
            if (cash is null)
                return null;

            // If a cash account has assigned users, only those users may use it in cash vouchers.
            var assignedCount = await _db.GenCashInformationUsers.AsNoTracking()
                .CountAsync(x => x.CashInfoId == cash.Id, ct);
            if (assignedCount > 0)
            {
                var user = await GetCurrentUserAsync(ct);
                if (user is null)
                    return Unauthorized();
                var allowed = await _db.GenCashInformationUsers.AsNoTracking()
                    .AnyAsync(x => x.CashInfoId == cash.Id && x.UserId == user.Id, ct);
                if (!allowed)
                    return BadRequest(new { message = "You are not allowed to use this cash account." });
            }
        }

        return null;
    }
}

public sealed class GlJournalVoucherListDto
{
    public int id { get; set; }
    public string? voucherNo { get; set; }
    public DateTime voucherDate { get; set; }
    public string? journalTitle { get; set; }
    public bool posted { get; set; }
    public decimal? totalDr { get; set; }
    public decimal? totalCr { get; set; }
    public bool readOnly { get; set; }
    public string? approvalStatusCode { get; set; }
}

public sealed class GlJournalVoucherDetailDto
{
    public int id { get; set; }
    public int voucherTypeId { get; set; }
    public string? voucherNo { get; set; }
    public DateTime voucherDate { get; set; }
    public string? remarks { get; set; }
    public string? manualNo { get; set; }
    public int? branchId { get; set; }
    public int? bankCashGlAccountId { get; set; }
    public string? chequeNo { get; set; }
    public DateTime? chequeDate { get; set; }
    public int voucherSystemType { get; set; }
    public byte? controlAccountTxnNature { get; set; }
    public bool showBankAndChequeDate { get; set; }
    public bool posted { get; set; }
    public bool cancelled { get; set; }
    public bool readOnly { get; set; }
    public int? approvalStatusId { get; set; }
    public string? approvalStatusCode { get; set; }
    public string? approvalStatusName { get; set; }
    public decimal? totalDr { get; set; }
    public decimal? totalCr { get; set; }
    public string? journalTitle { get; set; }
    public DateTime enteredAtUtc { get; set; }
    public DateTime? postedAtUtc { get; set; }
    public List<GlJournalVoucherLineDto> lines { get; set; } = [];
}

public sealed class GlJournalVoucherLineDto
{
    public int id { get; set; }
    public int glAccountId { get; set; }
    public string? glAccountLabel { get; set; }
    public string? narration { get; set; }
    public decimal dr { get; set; }
    public decimal cr { get; set; }
    public decimal? taxAmount { get; set; }
    public string? partnerRef { get; set; }
    public List<int> fbrSalesTaxRateIds { get; set; } = [];
    public List<string>? fbrSalesTaxRateLabels { get; set; }
    public int? fbrSalesTaxRateId { get; set; }
    public string? fbrSalesTaxRateLabel { get; set; }
    public int? partyId { get; set; }
    public string? partyLabel { get; set; }
}

public sealed class GlJournalVoucherWriteDto
{
    public int voucherTypeId { get; set; }
    public DateTime voucherDate { get; set; }
    public string? remarks { get; set; }
    public string? manualNo { get; set; }
    public int? branchId { get; set; }
    public int? bankCashGlAccountId { get; set; }
    public string? chequeNo { get; set; }
    public DateTime? chequeDate { get; set; }
    public List<GlJournalVoucherLineWriteDto> lines { get; set; } = [];
}

public sealed class GlJournalVoucherLineWriteDto
{
    public int glAccountId { get; set; }
    public string? narration { get; set; }
    public decimal dr { get; set; }
    public decimal cr { get; set; }
    public List<int> fbrSalesTaxRateIds { get; set; } = [];
    public int? partyId { get; set; }
}
