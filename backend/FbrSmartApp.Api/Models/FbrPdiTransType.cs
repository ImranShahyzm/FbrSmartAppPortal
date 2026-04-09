namespace FbrSmartApp.Api.Models;

public sealed class FbrPdiTransType
{
    public int CompanyId { get; set; }
    public int TransTypeId { get; set; }
    public string Description { get; set; } = "";
    public DateTime SyncedAtUtc { get; set; }
}
