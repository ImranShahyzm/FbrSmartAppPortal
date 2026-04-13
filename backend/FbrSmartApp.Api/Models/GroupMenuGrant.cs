namespace FbrSmartApp.Api.Models;

public sealed class GroupMenuGrant
{
    public int Id { get; set; }

    public int SecurityGroupId { get; set; }
    public SecurityGroup SecurityGroup { get; set; } = null!;

    /// <summary>Stable menu key from menu metadata (e.g. resource name or path id).</summary>
    public string MenuKey { get; set; } = "";

    public bool Visible { get; set; } = true;
}
