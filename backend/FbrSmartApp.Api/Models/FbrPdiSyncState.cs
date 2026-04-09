namespace FbrSmartApp.Api.Models;

public sealed class FbrPdiSyncState
{
    public int CompanyId { get; set; }
    public DateTime? LastSuccessAtUtc { get; set; }
    public string? LastError { get; set; }
}
