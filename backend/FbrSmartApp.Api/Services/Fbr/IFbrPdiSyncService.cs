namespace FbrSmartApp.Api.Services.Fbr;

public sealed class FbrPdiSyncOutcome
{
    public bool Success { get; init; }
    public string? Error { get; init; }
    public DateTime? SyncedAtUtc { get; init; }
}

public sealed class FbrPdiSaleTypeRateRowDto
{
    public int RateId { get; init; }
    public string RateDesc { get; init; } = "";
    public decimal RateValue { get; init; }
}

public interface IFbrPdiSyncService
{
    Task<FbrPdiSyncOutcome> SyncAsync(int companyId, CancellationToken ct);

    Task<IReadOnlyList<FbrPdiSaleTypeRateRowDto>> GetOrFetchSaleTypeRatesAsync(
        int companyId,
        int transTypeId,
        DateOnly rateDate,
        int originationSupplier,
        CancellationToken ct);
}
