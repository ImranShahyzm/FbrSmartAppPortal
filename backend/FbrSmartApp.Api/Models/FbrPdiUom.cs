namespace FbrSmartApp.Api.Models;

public sealed class FbrPdiUom
{
    public int CompanyId { get; set; }
    public int UomId { get; set; }
    public string Description { get; set; } = "";
    public DateTime SyncedAtUtc { get; set; }
}
