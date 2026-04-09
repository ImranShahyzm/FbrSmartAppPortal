namespace FbrSmartApp.Api.Auth;

public sealed class AuthOptions
{
    public string JwtIssuer { get; set; } = "FbrSmartApp";
    public string JwtAudience { get; set; } = "FbrSmartApp";
    public string JwtSigningKey { get; set; } = "";

    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 14;

    /// <summary>Company id whose admins may activate other tenants (SaaS).</summary>
    public int PlatformCompanyId { get; set; } = 1;

    public AdminUserOptions AdminUser { get; set; } = new();
}

public sealed class AdminUserOptions
{
    public string Username { get; set; } = "admin";
    public string Password { get; set; } = "admin";
    public string FullName { get; set; } = "Administrator";
}
