namespace FbrSmartApp.Api.Models;

public sealed class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public int CompanyId { get; set; }

    public string Username { get; set; } = "";
    public string FullName { get; set; } = "";

    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "Admin";

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public string? Email { get; set; }

    public string PreferredLanguage { get; set; } = "en-US";

    public string TimeZoneId { get; set; } = "Asia/Karachi";

    public bool OnboardingEnabled { get; set; }

    public string? EmailSignature { get; set; }

    /// <summary>public | private | only_me</summary>
    public string CalendarDefaultPrivacy { get; set; } = "public";

    /// <summary>email | inApp</summary>
    public string NotificationChannel { get; set; } = "email";

    /// <summary>JSON array of company ids, e.g. [1,2]</summary>
    public string AllowedCompanyIdsJson { get; set; } = "[]";

    public int? DefaultCompanyId { get; set; }

    /// <summary>Relative path under wwwroot/uploads, e.g. uploads/users/1/{guid}/avatar.png</summary>
    public string? ProfileImage { get; set; }

    /// <summary>JSON document for module/resource access (e.g. accounting.chartOfAccounts read/write).</summary>
    public string? AccessRightsJson { get; set; }

    /// <summary>JSON array of flat permission strings: app.resource.action (effective cache).</summary>
    public string? PermissionsJson { get; set; }

    public ICollection<UserSecurityGroup> SecurityGroupLinks { get; set; } = new List<UserSecurityGroup>();
}
