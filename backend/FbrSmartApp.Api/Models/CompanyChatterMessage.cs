namespace FbrSmartApp.Api.Models;

public sealed class CompanyChatterMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public int CompanyId { get; set; }

    public string Body { get; set; } = "";

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public string? AuthorDisplayName { get; set; }

    /// <summary>JSON array: [{ "name", "mime", "dataBase64" }]</summary>
    public string? AttachmentsJson { get; set; }
}

