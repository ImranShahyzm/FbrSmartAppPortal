using FbrSmartApp.Api.Models;

namespace FbrSmartApp.Api.Services.Fbr;

public static class FbrSalesTaxRateExtensions
{
    public static bool IsEffectiveOn(this FbrSalesTaxRate r, DateOnly invoiceDate) =>
        r.EffectiveFrom <= invoiceDate &&
        (r.EffectiveTo == null || r.EffectiveTo >= invoiceDate);

    public static DateOnly ToDateOnlyUtc(DateTime invoiceDateUtc) =>
        DateOnly.FromDateTime(invoiceDateUtc.Kind == DateTimeKind.Utc
            ? invoiceDateUtc.Date
            : DateTime.SpecifyKind(invoiceDateUtc, DateTimeKind.Utc).Date);
}
