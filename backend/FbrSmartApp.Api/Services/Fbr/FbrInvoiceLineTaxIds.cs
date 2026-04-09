using System.Text.Json;
using FbrSmartApp.Api.Models;

namespace FbrSmartApp.Api.Services.Fbr;

public static class FbrInvoiceLineTaxIds
{
    public static IReadOnlyList<int> Parse(FbrInvoiceLine line)
    {
        if (!string.IsNullOrWhiteSpace(line.FbrSalesTaxRateIdsJson))
        {
            try
            {
                var list = JsonSerializer.Deserialize<List<int>>(line.FbrSalesTaxRateIdsJson);
                if (list is { Count: > 0 })
                    return list.Distinct().ToList();
            }
            catch (JsonException)
            {
                /* ignore */
            }
        }

        if (line.FbrSalesTaxRateId is int sid && sid > 0)
            return [sid];
        return [];
    }
}
