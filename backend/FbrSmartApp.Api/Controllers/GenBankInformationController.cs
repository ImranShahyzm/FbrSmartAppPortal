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
[Route("api/genBankInformation")]
[Authorize]
public sealed class GenBankInformationController : ControllerBase
{
    private const int SerialStatusPageMax = 500;

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
        var dtos = rows.Select(ToListDto).ToList();

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
        var books = await _db.GenCheckBookInfos.AsNoTracking()
            .Where(c => c.BankId == id)
            .OrderBy(c => c.Id)
            .ToListAsync(ct);
        return Ok(ToDetailDto(x, books));
    }

    /// <summary>Paged cheque numbers in a book with status (available / used / cancelled).</summary>
    [HttpGet("{bankId:int}/check-books/{checkBookId:int}/serials")]
    [HasPermission("accounting.genBankInformation.read")]
    public async Task<IActionResult> GetCheckBookSerialStatus(
        int bankId,
        int checkBookId,
        [FromQuery] int page = 1,
        [FromQuery] int perPage = 20,
        [FromQuery] string? q = null,
        CancellationToken ct = default)
    {
        var companyId = GetCompanyIdOrThrow();
        perPage = Math.Clamp(perPage, 1, SerialStatusPageMax);
        page = Math.Max(1, page);
        var skip = (page - 1) * perPage;

        var bank = await _db.GenBankInformations.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == bankId && b.CompanyId == companyId, ct);
        if (bank is null) return NotFound();
        if (bank.GlcaId is null or <= 0)
            return BadRequest(new { message = "Bank has no linked GL account." });

        var book = await _db.GenCheckBookInfos.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == checkBookId && c.BankId == bankId, ct);
        if (book is null) return NotFound();
        if (book.SerialNoStart is null || book.SerialNoEnd is null)
            return Ok(new { items = Array.Empty<object>(), total = 0 });

        var start = book.SerialNoStart.Value;
        var end = book.SerialNoEnd.Value;
        if (end < start)
            return BadRequest(new { message = "Invalid cheque book range." });

        var totalCount = (long)(end - start + 1m);

        var svc = new ChequeBookService(_db);
        // Used = bank payments (bank system type + payment nature) that reference this bank's GL in BankCashGlAccountId.
        var usedRows = await _db.GlVoucherMains.AsNoTracking()
            .Where(v => v.CompanyId == companyId && v.BankCashGlAccountId == bank.GlcaId.Value && v.ChequeNo != null)
            .Join(
                _db.GlVoucherTypes.AsNoTracking(),
                m => m.VoucherTypeId,
                t => t.Id,
                (m, t) => new { m.Id, m.ChequeNo, t.SystemType, t.ControlAccountTxnNature })
            .Where(x => x.SystemType == 3 && x.ControlAccountTxnNature == 1)
            .Select(x => new { x.Id, x.ChequeNo })
            .ToListAsync(ct);

        var used = new HashSet<decimal>();
        var usedVoucherIdBySerial = new Dictionary<decimal, int>();
        foreach (var r in usedRows)
        {
            if (!ChequeBookService.TryParseChequeSerial(r.ChequeNo, out var d))
                continue;
            used.Add(d);
            // keep first voucher id per serial
            if (!usedVoucherIdBySerial.ContainsKey(d))
                usedVoucherIdBySerial[d] = r.Id;
        }
        var cancelled = await svc.GetCancelledDecimalsAsync(book.Id, ct);

        if (!string.IsNullOrWhiteSpace(q) && ChequeBookService.TryParseChequeSerial(q, out var qSerial))
        {
            if (qSerial >= start && qSerial <= end)
            {
                // Jump paging so the searched serial is on the first row.
                var jump = qSerial - start;
                if (jump < int.MaxValue)
                    skip = (int)jump;
            }
        }
        skip = Math.Clamp(skip, 0, (int)Math.Min(int.MaxValue, Math.Max(totalCount - 1, 0)));

        var items = new List<object>();
        // Page without walking the whole range: serial = start + (skip + i)
        var pageStart = start + skip;
        for (var i = 0; i < perPage; i++)
        {
            var d = pageStart + i;
            if (d > end) break;
            string status;
            if (cancelled.Contains(d))
                status = "cancelled";
            else if (used.Contains(d))
                status = "used";
            else
                status = "available";
            items.Add(new
            {
                serialNo = ChequeBookService.FormatChequeSerial(d),
                status,
                voucherId = status == "used" && usedVoucherIdBySerial.TryGetValue(d, out var vid) ? vid : (int?)null,
            });
        }

        return Ok(new { items, total = totalCount, skip, perPage });
    }

    [HttpPost("{bankId:int}/check-books/{checkBookId:int}/cancel-serial")]
    [HasPermission("accounting.genBankInformation.write")]
    public async Task<IActionResult> CancelCheckSerial(
        int bankId,
        int checkBookId,
        [FromBody] CancelChequeSerialDto body,
        CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var bank = await _db.GenBankInformations.FirstOrDefaultAsync(b => b.Id == bankId && b.CompanyId == companyId, ct);
        if (bank is null) return NotFound();

        var book = await _db.GenCheckBookInfos.FirstOrDefaultAsync(c => c.Id == checkBookId && c.BankId == bankId, ct);
        if (book is null) return NotFound();
        if (!ChequeBookService.TryParseChequeSerial(body.serialNo, out var serial))
            return BadRequest(new { message = "Invalid serial number." });
        if (!ChequeBookService.SerialInRange(serial, book))
            return BadRequest(new { message = "Serial is outside this cheque book." });

        var exists = await _db.GenCheckBookCancelledSerials.AnyAsync(
            x => x.CheckBookId == checkBookId && x.SerialNo == serial,
            ct);
        if (!exists)
        {
            _db.GenCheckBookCancelledSerials.Add(new GenCheckBookCancelledSerial
            {
                CheckBookId = checkBookId,
                SerialNo = serial,
            });
            await _db.SaveChangesAsync(ct);
        }

        return NoContent();
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
            ValidateChequeBook = body.validateChequeBook,
        };
        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            _db.GenBankInformations.Add(entity);
            await _db.SaveChangesAsync(ct);

            var err = await ReplaceCheckBooksAsync(companyId, entity.Id, body.checkBooks, ct);
            if (err != null)
            {
                await tx.RollbackAsync(ct);
                return err;
            }

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }

        return await GetOne(entity.Id, ct) is OkObjectResult ok
            ? CreatedAtAction(nameof(GetOne), new { id = entity.Id }, ok.Value)
            : await GetOne(entity.Id, ct);
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
        entity.ValidateChequeBook = body.validateChequeBook;

        var err = await ReplaceCheckBooksAsync(companyId, id, body.checkBooks, ct);
        if (err != null) return err;

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

    private async Task<IActionResult?> ReplaceCheckBooksAsync(
        int companyId,
        int bankId,
        IReadOnlyList<GenCheckBookLineDto>? lines,
        CancellationToken ct)
    {
        var bank = await _db.GenBankInformations.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == bankId && b.CompanyId == companyId, ct);
        if (bank is null) return NotFound();

        if (lines is null || lines.Count == 0)
        {
            var orphans = await _db.GenCheckBookInfos.Where(c => c.BankId == bankId).ToListAsync(ct);
            _db.GenCheckBookInfos.RemoveRange(orphans);
            return null;
        }

        var mutable = lines.Select(l => new GenCheckBookLineDto
        {
            id = l.id,
            serialNoStart = l.serialNoStart,
            serialNoEnd = l.serialNoEnd,
            isActive = l.isActive,
            branchId = l.branchId,
        }).ToList();

        EnsureSingleActiveCheckBook(mutable);

        foreach (var line in mutable)
        {
            if (line.serialNoStart is null || line.serialNoEnd is null)
                return BadRequest(new { message = "Each cheque book needs start and end serial." });
            if (line.serialNoEnd < line.serialNoStart)
                return BadRequest(new { message = "Cheque book end serial must be greater than or equal to start." });
        }

        // Validate ranges do not overlap within the same bank.
        var ranges = mutable
            .Select(l => new { Start = l.serialNoStart!.Value, End = l.serialNoEnd!.Value })
            .OrderBy(x => x.Start)
            .ToList();
        for (var i = 1; i < ranges.Count; i++)
        {
            var prev = ranges[i - 1];
            var cur = ranges[i];
            if (cur.Start <= prev.End)
                return BadRequest(new { message = "Cheque book serial range overlaps an existing range for this bank." });
        }

        var existingIds = await _db.GenCheckBookInfos.Where(c => c.BankId == bankId).Select(c => c.Id).ToListAsync(ct);
        var keepIds = mutable.Where(x => x.id is > 0).Select(x => x.id!.Value).ToHashSet();
        var toRemove = existingIds.Where(eid => !keepIds.Contains(eid)).ToList();
        if (toRemove.Count > 0)
        {
            // Prevent deleting cheque books whose serials have already been used in vouchers.
            // We treat "used" as any Bank Payment voucher (systemType=3 + control nature=1)
            // that references this bank's GL account in BankCashGlAccountId and has a numeric ChequeNo.
            if (bank.GlcaId is int glcaId && glcaId > 0)
            {
                var usedRows = await _db.GlVoucherMains.AsNoTracking()
                    .Where(v => v.CompanyId == companyId && v.BankCashGlAccountId == glcaId && v.ChequeNo != null)
                    .Join(
                        _db.GlVoucherTypes.AsNoTracking(),
                        m => m.VoucherTypeId,
                        t => t.Id,
                        (m, t) => new { m.ChequeNo, t.SystemType, t.ControlAccountTxnNature })
                    .Where(x => x.SystemType == 3 && x.ControlAccountTxnNature == 1)
                    .Select(x => x.ChequeNo!)
                    .ToListAsync(ct);

                var usedNums = new HashSet<decimal>();
                foreach (var s in usedRows)
                {
                    if (ChequeBookService.TryParseChequeSerial(s, out var d))
                        usedNums.Add(d);
                }

                var removeBooks = await _db.GenCheckBookInfos.AsNoTracking()
                    .Where(c => toRemove.Contains(c.Id))
                    .Select(c => new { c.Id, c.SerialNoStart, c.SerialNoEnd })
                    .ToListAsync(ct);

                foreach (var b in removeBooks)
                {
                    if (b.SerialNoStart is null || b.SerialNoEnd is null) continue;
                    var start = b.SerialNoStart.Value;
                    var end = b.SerialNoEnd.Value;
                    if (end < start) continue;
                    foreach (var u in usedNums)
                    {
                        if (u >= start && u <= end)
                        {
                            return BadRequest(new
                            {
                                message =
                                    "Cannot delete this cheque book because one or more cheque numbers from its range are already used in bank payment vouchers.",
                            });
                        }
                    }
                }
            }

            var removeEntities = await _db.GenCheckBookInfos.Where(c => toRemove.Contains(c.Id)).ToListAsync(ct);
            _db.GenCheckBookInfos.RemoveRange(removeEntities);
        }

        var now = DateTime.UtcNow;
        foreach (var line in mutable)
        {
            if (line.id is > 0)
            {
                var row = await _db.GenCheckBookInfos.FirstOrDefaultAsync(
                    c => c.Id == line.id && c.BankId == bankId,
                    ct);
                if (row is null)
                    return BadRequest(new { message = $"Unknown cheque book id {line.id}." });
                row.SerialNoStart = line.serialNoStart;
                row.SerialNoEnd = line.serialNoEnd;
                row.IsActive = line.isActive;
                row.BranchId = line.branchId;
                row.CompanyId = companyId;
                row.ModifyUserDateTime = now;
            }
            else
            {
                _db.GenCheckBookInfos.Add(new GenCheckBookInfo
                {
                    BankId = bankId,
                    CompanyId = companyId,
                    SerialNoStart = line.serialNoStart,
                    SerialNoEnd = line.serialNoEnd,
                    IsActive = line.isActive,
                    BranchId = line.branchId,
                    EntryUserDateTime = now,
                });
            }
        }

        return null;
    }

    private static void EnsureSingleActiveCheckBook(List<GenCheckBookLineDto> lines)
    {
        var activeIdx = lines.FindIndex(l => l.isActive);
        if (activeIdx < 0)
            return;
        for (var i = 0; i < lines.Count; i++)
        {
            if (i != activeIdx)
                lines[i].isActive = false;
        }
    }

    private static object ToListDto(GenBankInformation x) => new
    {
        id = x.Id,
        companyId = x.CompanyId,
        glcaId = x.GlcaId,
        validateChequeBook = x.ValidateChequeBook,
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

    private static object ToDetailDto(GenBankInformation x, IReadOnlyList<GenCheckBookInfo> checkBooks) => new
    {
        id = x.Id,
        companyId = x.CompanyId,
        glcaId = x.GlcaId,
        validateChequeBook = x.ValidateChequeBook,
        bankAccountTitle = x.BankAccountTitle,
        bankAccountNumber = x.BankAccountNumber,
        bankName = x.BankName,
        bankBranchCode = x.BankBranchCode,
        bankAddress = x.BankAddress,
        entryUserId = x.EntryUserId,
        entryUserDateTime = x.EntryUserDateTime,
        modifyUserId = x.ModifyUserId,
        modifyUserDateTime = x.ModifyUserDateTime,
        checkBooks = checkBooks.Select(c => new
        {
            id = c.Id,
            serialNoStart = c.SerialNoStart,
            serialNoEnd = c.SerialNoEnd,
            isActive = c.IsActive,
            branchId = c.BranchId,
        }).ToList(),
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
    public bool validateChequeBook { get; set; }
    public List<GenCheckBookLineDto>? checkBooks { get; set; }
}

public sealed class GenCheckBookLineDto
{
    public int? id { get; set; }
    public decimal? serialNoStart { get; set; }
    public decimal? serialNoEnd { get; set; }
    public bool isActive { get; set; }
    public int? branchId { get; set; }
}

public sealed class CancelChequeSerialDto
{
    public string? serialNo { get; set; }
}
