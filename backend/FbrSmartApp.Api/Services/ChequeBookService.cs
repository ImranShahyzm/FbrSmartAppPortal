using System.Globalization;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Services;

public sealed class ChequeBookService(AppDbContext db)
{
    public const int MaxSerialScan = 50_000;

    public async Task<GenBankInformation?> GetBankByGlAccountAsync(int companyId, int glcaId, CancellationToken ct) =>
        await db.GenBankInformations.AsNoTracking()
            .FirstOrDefaultAsync(b => b.CompanyId == companyId && b.GlcaId == glcaId, ct);

    public async Task<GenCheckBookInfo?> GetActiveCheckBookAsync(int bankInfoId, CancellationToken ct) =>
        await db.GenCheckBookInfos.AsNoTracking()
            .FirstOrDefaultAsync(c => c.BankId == bankInfoId && c.IsActive, ct);

    public async Task<HashSet<decimal>> GetUsedChequeDecimalsAsync(
        int companyId,
        int glcaId,
        int? excludeVoucherId,
        CancellationToken ct)
    {
        var raw = await db.GlVoucherMains.AsNoTracking()
            .Where(v =>
                v.CompanyId == companyId &&
                v.BankCashGlAccountId == glcaId &&
                v.ChequeNo != null &&
                (!excludeVoucherId.HasValue || v.Id != excludeVoucherId.Value))
            .Select(v => v.ChequeNo!)
            .ToListAsync(ct);

        var set = new HashSet<decimal>();
        foreach (var s in raw)
        {
            if (TryParseChequeSerial(s, out var d))
                set.Add(d);
        }

        return set;
    }

    public static bool TryParseChequeSerial(string? chequeNo, out decimal value)
    {
        value = 0;
        if (string.IsNullOrWhiteSpace(chequeNo))
            return false;
        var t = chequeNo.Trim();
        return decimal.TryParse(
            t,
            NumberStyles.Number,
            CultureInfo.InvariantCulture,
            out value);
    }

    public static string FormatChequeSerial(decimal d) =>
        d.ToString("0", CultureInfo.InvariantCulture);

    public async Task<HashSet<decimal>> GetCancelledDecimalsAsync(int checkBookId, CancellationToken ct) =>
        await db.GenCheckBookCancelledSerials.AsNoTracking()
            .Where(x => x.CheckBookId == checkBookId)
            .Select(x => x.SerialNo)
            .ToHashSetAsync(ct);

    /// <summary>Next unused non-cancelled serial in the active cheque book, or null.</summary>
    public async Task<string?> GetNextSuggestedChequeNoAsync(int companyId, int glcaId, CancellationToken ct)
    {
        var bank = await GetBankByGlAccountAsync(companyId, glcaId, ct);
        if (bank is null || !bank.ValidateChequeBook)
            return null;

        var book = await GetActiveCheckBookAsync(bank.Id, ct);
        if (book is null || book.SerialNoStart is null || book.SerialNoEnd is null)
            return null;

        var start = book.SerialNoStart.Value;
        var end = book.SerialNoEnd.Value;
        if (end < start)
            return null;

        var used = await GetUsedChequeDecimalsAsync(companyId, glcaId, null, ct);
        var cancelled = await GetCancelledDecimalsAsync(book.Id, ct);

        // Range can be huge (e.g. a whole year of cheques). We only need the *next* free number,
        // so scan forward from start with a hard cap to avoid runaway loops on bad data.
        var scanned = 0;
        for (var d = start; d <= end; d += 1m)
        {
            if (scanned++ >= MaxSerialScan)
                return null;
            if (!used.Contains(d) && !cancelled.Contains(d))
                return FormatChequeSerial(d);
        }

        return null;
    }

    /// <summary>Validates cheque is in active book range, not cancelled, and not used on another voucher.</summary>
    public async Task<(bool ok, string? error)> ValidateBankPaymentChequeAsync(
        int companyId,
        int glcaId,
        string? chequeNo,
        int? excludeVoucherId,
        CancellationToken ct)
    {
        var bank = await GetBankByGlAccountAsync(companyId, glcaId, ct);
        if (bank is null || !bank.ValidateChequeBook)
            return (true, null);

        if (string.IsNullOrWhiteSpace(chequeNo))
            return (false, "Cheque number is required when cheque book validation is enabled for this bank.");

        if (!TryParseChequeSerial(chequeNo, out var serial))
            return (false, "Cheque number must be numeric.");

        var book = await GetActiveCheckBookAsync(bank.Id, ct);
        if (book is null || book.SerialNoStart is null || book.SerialNoEnd is null)
            return (false, "No active cheque book is configured for this bank.");

        if (serial < book.SerialNoStart.Value || serial > book.SerialNoEnd.Value)
            return (false, "Cheque number is outside the active cheque book range.");

        var cancelled = await GetCancelledDecimalsAsync(book.Id, ct);
        if (cancelled.Contains(serial))
            return (false, "This cheque number was cancelled.");

        var used = await GetUsedChequeDecimalsAsync(companyId, glcaId, excludeVoucherId, ct);
        if (used.Contains(serial))
            return (false, "This cheque number is already used on another bank payment.");

        return (true, null);
    }

    public static bool SerialInRange(decimal serial, GenCheckBookInfo book) =>
        book.SerialNoStart is decimal a &&
        book.SerialNoEnd is decimal b &&
        serial >= a &&
        serial <= b;
}
