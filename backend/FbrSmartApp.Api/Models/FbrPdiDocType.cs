namespace FbrSmartApp.Api.Models;

public sealed class FbrPdiDocType
{
    public int CompanyId { get; set; }
    public int DocTypeId { get; set; }
    public string Description { get; set; } = "";
    public DateTime SyncedAtUtc { get; set; }
}
