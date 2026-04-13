namespace FbrSmartApp.Api.Models;

public sealed class SecurityGroupInheritance
{
    public int SecurityGroupId { get; set; }
    public SecurityGroup SecurityGroup { get; set; } = null!;

    public int ParentSecurityGroupId { get; set; }
    public SecurityGroup ParentGroup { get; set; } = null!;
}
