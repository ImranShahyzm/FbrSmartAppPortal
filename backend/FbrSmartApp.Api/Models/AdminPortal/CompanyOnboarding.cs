namespace FbrSmartApp.Api.Models.AdminPortal;

public sealed class CompanyOnboarding
{
    public int CompanyId { get; set; }

    public DateTime RegisteredAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>pending | confirmed | failed | waived</summary>
    public string PaymentStatus { get; set; } = "pending";

    /// <summary>monthly | annual | custom</summary>
    public string PaymentModel { get; set; } = "monthly";

    public string? PaymentNotes { get; set; }
    public decimal? Amount { get; set; }
    public string? Currency { get; set; }

    public DateTime? ActivatedAtUtc { get; set; }
    public DateTime? DeactivatedAtUtc { get; set; }

    public DateTime? LastUpdatedAtUtc { get; set; }
    public string? LastUpdatedByEmail { get; set; }
}

