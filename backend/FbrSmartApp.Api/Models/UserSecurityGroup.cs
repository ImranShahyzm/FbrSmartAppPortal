namespace FbrSmartApp.Api.Models;

public sealed class UserSecurityGroup
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public int SecurityGroupId { get; set; }
    public SecurityGroup SecurityGroup { get; set; } = null!;
}
