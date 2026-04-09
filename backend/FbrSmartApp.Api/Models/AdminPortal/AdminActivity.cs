namespace FbrSmartApp.Api.Models.AdminPortal;

public sealed class AdminActivity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public Guid AdminUserId { get; set; }
    public string AdminEmail { get; set; } = "";

    public int? CompanyId { get; set; }

    public string Action { get; set; } = "";
    public string? Notes { get; set; }
}

