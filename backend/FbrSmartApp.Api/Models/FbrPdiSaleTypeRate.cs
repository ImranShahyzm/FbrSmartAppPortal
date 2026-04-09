namespace FbrSmartApp.Api.Models;

public sealed class FbrPdiSaleTypeRate
{
    public int CompanyId { get; set; }
    public int TransTypeId { get; set; }
    public DateOnly RateDate { get; set; }
    public int OriginationSupplier { get; set; }
    public int RateId { get; set; }
    public string RateDesc { get; set; } = "";
    public decimal RateValue { get; set; }
    public DateTime SyncedAtUtc { get; set; }
}
