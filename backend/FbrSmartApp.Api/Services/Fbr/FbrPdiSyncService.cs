using System.Globalization;
using System.Text.Json;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Services.Fbr;

public sealed class FbrPdiSyncService : IFbrPdiSyncService
{
    private readonly AppDbContext _db;
    private readonly IFbrPdiClient _pdi;

    public FbrPdiSyncService(AppDbContext db, IFbrPdiClient pdi)
    {
        _db = db;
        _pdi = pdi;
    }

    public async Task<FbrPdiSyncOutcome> SyncAsync(int companyId, CancellationToken ct)
    {
        var company = await _db.Companies.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == companyId, ct);
        if (company is null)
            return Fail("Company not found.");

        var token = ResolveToken(company);
        if (string.IsNullOrWhiteSpace(token))
            return Fail("FBR token is not configured for the current environment (sandbox/production).");

        try
        {
            await SyncProvincesAsync(companyId, token, ct);
            await SyncDocTypesAsync(companyId, token, ct);
            await SyncItemDescCodesAsync(companyId, token, ct);
            var transTypeIds = await SyncTransTypesAsync(companyId, token, ct);
            await SyncUomsAsync(companyId, token, ct);
            await SyncSaleTypeRatesForTransTypesAsync(companyId, token, transTypeIds, ct);

            var now = DateTime.UtcNow;
            var state = await _db.FbrPdiSyncStates.FirstOrDefaultAsync(x => x.CompanyId == companyId, ct);
            if (state is null)
            {
                state = new FbrPdiSyncState { CompanyId = companyId };
                _db.FbrPdiSyncStates.Add(state);
            }

            state.LastSuccessAtUtc = now;
            state.LastError = null;
            await _db.SaveChangesAsync(ct);

            return new FbrPdiSyncOutcome { Success = true, SyncedAtUtc = now };
        }
        catch (Exception ex)
        {
            var msg = ex.Message;
            if (msg.Length > 1900)
                msg = msg[..1900];
            var state = await _db.FbrPdiSyncStates.FirstOrDefaultAsync(x => x.CompanyId == companyId, ct);
            if (state is null)
            {
                state = new FbrPdiSyncState { CompanyId = companyId };
                _db.FbrPdiSyncStates.Add(state);
            }

            state.LastError = msg;
            await _db.SaveChangesAsync(ct);
            return new FbrPdiSyncOutcome { Success = false, Error = ex.Message };
        }
    }

    public async Task<IReadOnlyList<FbrPdiSaleTypeRateRowDto>> GetOrFetchSaleTypeRatesAsync(
        int companyId,
        int transTypeId,
        DateOnly rateDate,
        int originationSupplier,
        CancellationToken ct)
    {
        var existing = await _db.FbrPdiSaleTypeRates.AsNoTracking()
            .Where(x =>
                x.CompanyId == companyId &&
                x.TransTypeId == transTypeId &&
                x.RateDate == rateDate &&
                x.OriginationSupplier == originationSupplier)
            .OrderBy(x => x.RateId)
            .Select(x => new FbrPdiSaleTypeRateRowDto
            {
                RateId = x.RateId,
                RateDesc = x.RateDesc,
                RateValue = x.RateValue,
            })
            .ToListAsync(ct);

        if (existing.Count > 0)
            return existing;

        var company = await _db.Companies.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == companyId, ct)
            ?? throw new InvalidOperationException("Company not found.");

        var token = ResolveToken(company);
        if (string.IsNullOrWhiteSpace(token))
            throw new InvalidOperationException("FBR token is not configured.");

        await FetchAndStoreRatesAsync(companyId, transTypeId, rateDate, originationSupplier, token, ct);

        return await _db.FbrPdiSaleTypeRates.AsNoTracking()
            .Where(x =>
                x.CompanyId == companyId &&
                x.TransTypeId == transTypeId &&
                x.RateDate == rateDate &&
                x.OriginationSupplier == originationSupplier)
            .OrderBy(x => x.RateId)
            .Select(x => new FbrPdiSaleTypeRateRowDto
            {
                RateId = x.RateId,
                RateDesc = x.RateDesc,
                RateValue = x.RateValue,
            })
            .ToListAsync(ct);
    }

    private static string? ResolveToken(Models.Company company) =>
        company.EnableSandBox
            ? company.FbrTokenSandBox?.Trim()
            : company.FbrTokenProduction?.Trim();

    private static FbrPdiSyncOutcome Fail(string error) =>
        new() { Success = false, Error = error };

    private async Task SyncProvincesAsync(int companyId, string token, CancellationToken ct)
    {
        var json = await _pdi.GetAsync("pdi/v1/provinces", token, ct);
        using var doc = JsonDocument.Parse(json);
        foreach (var el in FbrPdiJson.EnumerateItems(doc.RootElement))
        {
            var code = FbrPdiJson.GetIntLoose(el, "stateProvinceCode", "StateProvinceCode", "provinceCode");
            if (code == 0)
                continue;
            var desc = FbrPdiJson.GetStringLoose(el, "stateProvinceDesc", "StateProvinceDesc", "provincename");
            var row = await _db.FbrPdiProvinces.FirstOrDefaultAsync(
                x => x.CompanyId == companyId && x.StateProvinceCode == code, ct);
            var now = DateTime.UtcNow;
            if (row is null)
            {
                _db.FbrPdiProvinces.Add(new FbrPdiProvince
                {
                    CompanyId = companyId,
                    StateProvinceCode = code,
                    Description = desc,
                    SyncedAtUtc = now,
                });
            }
            else
            {
                row.Description = desc;
                row.SyncedAtUtc = now;
            }
        }

        await _db.SaveChangesAsync(ct);
    }

    private async Task SyncDocTypesAsync(int companyId, string token, CancellationToken ct)
    {
        var json = await _pdi.GetAsync("pdi/v1/doctypecode", token, ct);
        using var doc = JsonDocument.Parse(json);
        foreach (var el in FbrPdiJson.EnumerateItems(doc.RootElement))
        {
            var id = FbrPdiJson.GetIntLoose(el, "docTypeId", "DocTypeId");
            if (id == 0)
                continue;
            var desc = FbrPdiJson.GetStringLoose(el, "docDescription", "DocDescription", "description");
            var row = await _db.FbrPdiDocTypes.FirstOrDefaultAsync(
                x => x.CompanyId == companyId && x.DocTypeId == id, ct);
            var now = DateTime.UtcNow;
            if (row is null)
            {
                _db.FbrPdiDocTypes.Add(new FbrPdiDocType
                {
                    CompanyId = companyId,
                    DocTypeId = id,
                    Description = desc,
                    SyncedAtUtc = now,
                });
            }
            else
            {
                row.Description = desc;
                row.SyncedAtUtc = now;
            }
        }

        await _db.SaveChangesAsync(ct);
    }

    private async Task SyncItemDescCodesAsync(int companyId, string token, CancellationToken ct)
    {
        var json = await _pdi.GetAsync("pdi/v1/itemdesccode", token, ct);
        using var doc = JsonDocument.Parse(json);
        foreach (var el in FbrPdiJson.EnumerateItems(doc.RootElement))
        {
            var hs = FbrPdiJson.GetStringLoose(el, "hS_CODE", "HS_CODE", "hs_code", "hsCode", "HSCode");
            hs = hs.Trim();
            if (string.IsNullOrWhiteSpace(hs))
                continue;
            if (hs.Length > 32)
                hs = hs[..32];
            var desc = FbrPdiJson.GetStringLoose(el, "description", "Description", "docDescription", "DocDescription");
            var row = await _db.FbrPdiItemDescCodes.FirstOrDefaultAsync(
                x => x.CompanyId == companyId && x.HsCode == hs, ct);
            var now = DateTime.UtcNow;
            if (row is null)
            {
                _db.FbrPdiItemDescCodes.Add(new FbrPdiItemDescCode
                {
                    CompanyId = companyId,
                    HsCode = hs,
                    Description = desc,
                    SyncedAtUtc = now,
                });
            }
            else
            {
                row.Description = desc;
                row.SyncedAtUtc = now;
            }
        }

        await _db.SaveChangesAsync(ct);
    }

    private async Task<List<int>> SyncTransTypesAsync(int companyId, string token, CancellationToken ct)
    {
        var json = await _pdi.GetAsync("pdi/v1/transtypecode", token, ct);
        using var doc = JsonDocument.Parse(json);
        var ids = new List<int>();
        foreach (var el in FbrPdiJson.EnumerateItems(doc.RootElement))
        {
            var id = FbrPdiJson.GetIntLoose(el, "transactioN_TYPE_ID", "transactionTypeId", "transTypeId");
            if (id == 0)
                continue;
            ids.Add(id);
            var desc = FbrPdiJson.GetStringLoose(el, "transactioN_DESC", "transactionDesc", "transTypeDesc");
            var row = await _db.FbrPdiTransTypes.FirstOrDefaultAsync(
                x => x.CompanyId == companyId && x.TransTypeId == id, ct);
            var now = DateTime.UtcNow;
            if (row is null)
            {
                _db.FbrPdiTransTypes.Add(new FbrPdiTransType
                {
                    CompanyId = companyId,
                    TransTypeId = id,
                    Description = desc,
                    SyncedAtUtc = now,
                });
            }
            else
            {
                row.Description = desc;
                row.SyncedAtUtc = now;
            }
        }

        await _db.SaveChangesAsync(ct);
        return ids.Distinct().ToList();
    }

    private async Task SyncUomsAsync(int companyId, string token, CancellationToken ct)
    {
        var json = await _pdi.GetAsync("pdi/v1/uom", token, ct);
        using var doc = JsonDocument.Parse(json);
        foreach (var el in FbrPdiJson.EnumerateItems(doc.RootElement))
        {
            var id = FbrPdiJson.GetIntLoose(el, "uoM_ID", "uomId", "UomId");
            if (id == 0)
                continue;
            var desc = FbrPdiJson.GetStringLoose(el, "description", "Description", "uoM_DESC");
            var row = await _db.FbrPdiUoms.FirstOrDefaultAsync(
                x => x.CompanyId == companyId && x.UomId == id, ct);
            var now = DateTime.UtcNow;
            if (row is null)
            {
                _db.FbrPdiUoms.Add(new FbrPdiUom
                {
                    CompanyId = companyId,
                    UomId = id,
                    Description = desc,
                    SyncedAtUtc = now,
                });
            }
            else
            {
                row.Description = desc;
                row.SyncedAtUtc = now;
            }
        }

        await _db.SaveChangesAsync(ct);
    }

    private async Task SyncSaleTypeRatesForTransTypesAsync(
        int companyId,
        string token,
        IReadOnlyList<int> transTypeIds,
        CancellationToken ct)
    {
        var rateDate = DateOnly.FromDateTime(DateTime.UtcNow);
        const int orig = 1;
        foreach (var tt in transTypeIds)
        {
            try
            {
                await FetchAndStoreRatesAsync(companyId, tt, rateDate, orig, token, ct);
            }
            catch
            {
                // Some transaction types may not have rates for the chosen date; continue with others.
            }
        }
    }

    private async Task FetchAndStoreRatesAsync(
        int companyId,
        int transTypeId,
        DateOnly rateDate,
        int originationSupplier,
        string token,
        CancellationToken ct)
    {
        var dateStr = rateDate.ToString("dd-MMM-yyyy", CultureInfo.InvariantCulture);
        var q =
            $"pdi/v2/SaleTypeToRate?date={Uri.EscapeDataString(dateStr)}&transTypeId={transTypeId}&originationSupplier={originationSupplier}";
        var json = await _pdi.GetAsync(q, token, ct);
        using var doc = JsonDocument.Parse(json);

        await _db.FbrPdiSaleTypeRates
            .Where(x =>
                x.CompanyId == companyId &&
                x.TransTypeId == transTypeId &&
                x.RateDate == rateDate &&
                x.OriginationSupplier == originationSupplier)
            .ExecuteDeleteAsync(ct);

        var now = DateTime.UtcNow;
        foreach (var el in FbrPdiJson.EnumerateItems(doc.RootElement))
        {
            var rateId = FbrPdiJson.GetIntLoose(el, "ratE_ID", "rateId", "RateId");
            if (rateId == 0)
                continue;
            var desc = FbrPdiJson.GetStringLoose(el, "ratE_DESC", "rateDesc", "RateDesc");
            var val = FbrPdiJson.GetDecimalLoose(el, "ratE_VALUE", "rateValue", "RateValue");
            _db.FbrPdiSaleTypeRates.Add(new FbrPdiSaleTypeRate
            {
                CompanyId = companyId,
                TransTypeId = transTypeId,
                RateDate = rateDate,
                OriginationSupplier = originationSupplier,
                RateId = rateId,
                RateDesc = desc,
                RateValue = val,
                SyncedAtUtc = now,
            });
        }

        await _db.SaveChangesAsync(ct);
    }
}
