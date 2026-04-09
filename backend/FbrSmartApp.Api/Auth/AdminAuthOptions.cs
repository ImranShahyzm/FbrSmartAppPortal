namespace FbrSmartApp.Api.Auth;

public sealed class AdminAuthOptions
{
    public string JwtIssuer { get; set; } = "FbrAdminPortal";
    public string JwtAudience { get; set; } = "FbrAdminPortal";
    public string JwtSigningKey { get; set; } = "";

    public int AccessTokenMinutes { get; set; } = 30;
    public int RefreshTokenDays { get; set; } = 14;
}

