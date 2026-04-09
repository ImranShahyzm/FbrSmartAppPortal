namespace FbrSmartApp.Api.Models.AdminPortal;

public sealed class AdminAuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public Guid AdminUserId { get; set; }
    public string AdminEmail { get; set; } = "";

    public string Resource { get; set; } = "";
    public string Action { get; set; } = "";

    public int? CompanyId { get; set; }

    /// <summary>JSON payload describing the change.</summary>
    public string? PayloadJson { get; set; }
}

