namespace FbrSmartApp.Api.Models;

public sealed class SecurityGroup
{
    public int Id { get; set; }

    public int CompanyId { get; set; }

    public string Name { get; set; } = "";

    /// <summary>Optional scope label shown in header (e.g. technical area).</summary>
    public string? ApplicationScope { get; set; }

    public bool ShareGroup { get; set; }

    public decimal? ApiKeysMaxDurationDays { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<UserSecurityGroup> UserLinks { get; set; } = new List<UserSecurityGroup>();
    public ICollection<GroupAccessRight> AccessRights { get; set; } = new List<GroupAccessRight>();
    public ICollection<GroupRecordRule> RecordRules { get; set; } = new List<GroupRecordRule>();
    public ICollection<GroupMenuGrant> MenuGrants { get; set; } = new List<GroupMenuGrant>();
    public ICollection<SecurityGroupInheritance> ParentLinks { get; set; } = new List<SecurityGroupInheritance>();
}
