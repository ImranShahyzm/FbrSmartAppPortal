using System.Text.Json;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Services;

public sealed class AppRecordMessageService
{
    public const byte KindNote = 0;
    public const byte KindSystem = 1;

    private readonly AppDbContext _db;

    public AppRecordMessageService(AppDbContext db)
    {
        _db = db;
    }

    /// <param name="detailBody">Optional human-readable line for the activity feed (who did what).</param>
    public async Task AddSystemAsync(
        int companyId,
        string resourceKey,
        string recordKey,
        string systemAction,
        Guid? authorUserId,
        string? authorDisplayName,
        CancellationToken ct,
        string? detailBody = null)
    {
        _db.AppRecordMessages.Add(new AppRecordMessage
        {
            CompanyId = companyId,
            ResourceKey = resourceKey.Trim(),
            RecordKey = recordKey.Trim(),
            Kind = KindSystem,
            SystemAction = systemAction.Trim(),
            Body = string.IsNullOrWhiteSpace(detailBody) ? "" : detailBody.Trim(),
            AuthorUserId = authorUserId,
            AuthorDisplayName = authorDisplayName,
            CreatedAtUtc = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync(ct);
    }

    public async Task AddNoteAsync(
        int companyId,
        string resourceKey,
        string recordKey,
        string body,
        Guid authorUserId,
        string? authorDisplayName,
        IReadOnlyList<ChatterAttachmentDto>? attachments,
        IReadOnlyList<Guid>? mentionedUserIds,
        CancellationToken ct)
    {
        string? attachJson = null;
        if (attachments is { Count: > 0 })
            attachJson = JsonSerializer.Serialize(attachments);

        string? mentionJson = null;
        if (mentionedUserIds is { Count: > 0 })
            mentionJson = JsonSerializer.Serialize(mentionedUserIds.Select(x => x.ToString()).ToList());

        _db.AppRecordMessages.Add(new AppRecordMessage
        {
            CompanyId = companyId,
            ResourceKey = resourceKey.Trim(),
            RecordKey = recordKey.Trim(),
            Kind = KindNote,
            Body = body ?? "",
            AuthorUserId = authorUserId,
            AuthorDisplayName = authorDisplayName,
            CreatedAtUtc = DateTime.UtcNow,
            AttachmentsJson = attachJson,
            MentionedUserIdsJson = mentionJson,
        });
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAllForRecordAsync(int companyId, string resourceKey, string recordKey, CancellationToken ct)
    {
        var rk = resourceKey.Trim();
        var rec = recordKey.Trim();
        await _db.AppRecordMessages
            .Where(x => x.CompanyId == companyId && x.ResourceKey == rk && x.RecordKey == rec)
            .ExecuteDeleteAsync(ct);
    }
}

public sealed class ChatterAttachmentDto
{
    public string name { get; set; } = "";
    public string mime { get; set; } = "";
    public string dataBase64 { get; set; } = "";
}
