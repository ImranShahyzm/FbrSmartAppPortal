using System.Text.Json.Serialization;

namespace FbrSmartApp.Api.Models.AdminPortal;

public sealed class AdminCompanyChatterMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public int CompanyId { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public Guid AdminUserId { get; set; }
    public string AuthorEmail { get; set; } = "";
    public string? AuthorDisplayName { get; set; }

    public string Body { get; set; } = "";

    /// <summary>JSON array of attachments: {name,mime,dataBase64}</summary>
    public string? AttachmentsJson { get; set; }
}

