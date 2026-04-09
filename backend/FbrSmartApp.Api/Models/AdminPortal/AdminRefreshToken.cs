namespace FbrSmartApp.Api.Models.AdminPortal;

public sealed class AdminRefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AdminUserId { get; set; }
    public AdminUser? AdminUser { get; set; }

    public string TokenHash { get; set; } = "";

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAtUtc { get; set; }

    public DateTime? RevokedAtUtc { get; set; }
    public string? ReplacedByTokenHash { get; set; }

    public bool IsRevoked => RevokedAtUtc != null;
    public bool IsExpired(DateTime utcNow) => utcNow >= ExpiresAtUtc;
}

