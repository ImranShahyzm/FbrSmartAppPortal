namespace FbrSmartApp.Api.Models;

public sealed class FbrPdiProvince
{
    public int CompanyId { get; set; }
    public int StateProvinceCode { get; set; }
    public string Description { get; set; } = "";
    public DateTime SyncedAtUtc { get; set; }
}
