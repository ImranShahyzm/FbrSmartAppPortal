namespace FbrSmartApp.Api.Models;

public sealed class FbrInvoiceChatterMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid InvoiceId { get; set; }
    public FbrInvoice? Invoice { get; set; }

    public string Body { get; set; } = "";

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public string? AuthorDisplayName { get; set; }

    /// <summary>JSON array: [{ "name", "mime", "dataBase64" }]</summary>
    public string? AttachmentsJson { get; set; }
}
