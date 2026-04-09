namespace FbrSmartApp.Api.Models.AdminPortal;

public sealed class AdminUser
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Email { get; set; } = "";
    public string FullName { get; set; } = "";

    public string PasswordHash { get; set; } = "";

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public string Role { get; set; } = "Admin";
}

