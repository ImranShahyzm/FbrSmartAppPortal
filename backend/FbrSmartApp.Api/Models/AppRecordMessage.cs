namespace FbrSmartApp.Api.Models;

/// <summary>
/// Generic thread row for any screen: internal notes (attachments, mentions) and optional system activity lines.
/// </summary>
public sealed class AppRecordMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public int CompanyId { get; set; }

    /// <summary>Stable key for the parent resource (e.g. glVoucherTypes, fbrInvoices).</summary>
    public string ResourceKey { get; set; } = "";

    /// <summary>String id of the parent row (int or guid string).</summary>
    public string RecordKey { get; set; } = "";

    /// <summary>0 = user note, 1 = system activity.</summary>
    public byte Kind { get; set; }

    /// <summary>For system rows: Created, Updated, Deleted.</summary>
    public string? SystemAction { get; set; }

    public string Body { get; set; } = "";

    public Guid? AuthorUserId { get; set; }

    public string? AuthorDisplayName { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>JSON array: [{ "name", "mime", "dataBase64" }]</summary>
    public string? AttachmentsJson { get; set; }

    /// <summary>JSON array of user Guid strings for in-app mentions.</summary>
    public string? MentionedUserIdsJson { get; set; }
}
