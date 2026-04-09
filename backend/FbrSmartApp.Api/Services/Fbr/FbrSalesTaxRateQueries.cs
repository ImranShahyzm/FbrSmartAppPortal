using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Services.Fbr;

public static class FbrSalesTaxRateQueries
{
    public static async Task<FbrSalesTaxRate?> TryGetEffectiveAsync(
        AppDbContext db,
        int companyId,
        int rateId,
        DateTime invoiceDateUtc,
        CancellationToken ct)
    {
        var asOf = FbrSalesTaxRateExtensions.ToDateOnlyUtc(invoiceDateUtc);
        return await db.FbrSalesTaxRates.AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.Id == rateId &&
                x.CompanyId == companyId &&
                x.EffectiveFrom <= asOf &&
                (x.EffectiveTo == null || x.EffectiveTo >= asOf), ct);
    }

    public static async Task<Dictionary<int, FbrSalesTaxRate>> GetByIdsAsync(
        AppDbContext db,
        int companyId,
        IReadOnlyCollection<int> ids,
        CancellationToken ct)
    {
        if (ids.Count == 0)
            return new Dictionary<int, FbrSalesTaxRate>();
        return await db.FbrSalesTaxRates.AsNoTracking()
            .Where(x => x.CompanyId == companyId && ids.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, ct);
    }
}
