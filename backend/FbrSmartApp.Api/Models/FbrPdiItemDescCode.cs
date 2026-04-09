namespace FbrSmartApp.Api.Models;

/// <summary>PDI item/HS description master from itemdesccode (FBR: hS_CODE + description).</summary>
public sealed class FbrPdiItemDescCode
{
    public int CompanyId { get; set; }
    public string HsCode { get; set; } = "";
    public string Description { get; set; } = "";
    public DateTime SyncedAtUtc { get; set; }
}
