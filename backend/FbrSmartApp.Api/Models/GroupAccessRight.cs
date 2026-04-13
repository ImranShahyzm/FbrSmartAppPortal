namespace FbrSmartApp.Api.Models;

public sealed class GroupAccessRight
{
    public int Id { get; set; }

    public int SecurityGroupId { get; set; }
    public SecurityGroup SecurityGroup { get; set; } = null!;

    public string DisplayName { get; set; } = "";

    /// <summary>Resource key from the permission catalog (e.g. glChartAccounts).</summary>
    public string ModelKey { get; set; } = "";

    /// <summary>Permission prefix (e.g. accounting, fbr).</summary>
    public string PermissionsPrefix { get; set; } = "";

    public bool CanRead { get; set; }
    public bool CanWrite { get; set; }
    public bool CanCreate { get; set; }
    public bool CanDelete { get; set; }
}
