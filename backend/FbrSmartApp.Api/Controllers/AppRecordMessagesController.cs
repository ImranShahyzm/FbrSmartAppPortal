using System.Security.Claims;
using System.Text.Json;
using FbrSmartApp.Api.Auth;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using FbrSmartApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/appRecordMessages")]
[Authorize]
public sealed class AppRecordMessagesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AppRecordMessageService _messages;

    public AppRecordMessagesController(AppDbContext db, AppRecordMessageService messages)
    {
        _db = db;
        _messages = messages;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string resourceKey,
        [FromQuery] string recordId,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(resourceKey) || string.IsNullOrWhiteSpace(recordId))
            return BadRequest(new { message = "resourceKey and recordId are required." });
        if (!AppRecordMessagePolicy.TryResolvePermissions(resourceKey, out var read, out _))
            return BadRequest(new { message = "Unknown resourceKey." });
        if (!HasPermissionClaim(read))
            return Forbid();

        var companyId = GetCompanyIdOrThrow();
        var rk = resourceKey.Trim();
        var rec = recordId.Trim();

        var rows = await _db.AppRecordMessages.AsNoTracking()
            .Where(x => x.CompanyId == companyId && x.ResourceKey == rk && x.RecordKey == rec)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(ct);

        var dtos = rows.Select(MapDto).ToList();

        var mentionGuids = new HashSet<Guid>();
        foreach (var row in rows)
            CollectMentionGuids(row, mentionGuids);

        var mentionProfiles = new Dictionary<string, MentionUserProfileDto>();
        if (mentionGuids.Count > 0)
        {
            var users = await _db.Users.AsNoTracking()
                .Where(u => u.CompanyId == companyId && mentionGuids.Contains(u.Id))
                .Select(u => new MentionUserProfileDto
                {
                    id = u.Id,
                    fullName = u.FullName,
                    username = u.Username,
                    email = u.Email,
                    phone = null,
                })
                .ToListAsync(ct);
            foreach (var u in users)
                mentionProfiles[u.id.ToString()] = u;
        }

        return Ok(new AppRecordMessagesLoadDto { messages = dtos, mentionProfiles = mentionProfiles });
    }

    /// <summary>Minimal profile for hover card when viewing @mentions (same read scope as the thread).</summary>
    [HttpGet("user-profile")]
    public async Task<IActionResult> UserProfile(
        [FromQuery] string resourceKey,
        [FromQuery] string userId,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(resourceKey) || string.IsNullOrWhiteSpace(userId))
            return BadRequest(new { message = "resourceKey and userId are required." });
        if (!AppRecordMessagePolicy.TryResolvePermissions(resourceKey, out var read, out _))
            return BadRequest(new { message = "Unknown resourceKey." });
        if (!HasPermissionClaim(read))
            return Forbid();
        if (!Guid.TryParse(userId.Trim(), out var uid))
            return BadRequest(new { message = "Invalid userId." });

        var companyId = GetCompanyIdOrThrow();
        var row = await _db.Users.AsNoTracking()
            .Where(u => u.Id == uid && u.CompanyId == companyId)
            .Select(u => new MentionUserProfileDto
            {
                id = u.Id,
                fullName = u.FullName,
                username = u.Username,
                email = u.Email,
                phone = null,
            })
            .FirstOrDefaultAsync(ct);
        if (row is null)
            return NotFound();

        return Ok(row);
    }

    private static void CollectMentionGuids(AppRecordMessage row, ISet<Guid> target)
    {
        if (string.IsNullOrWhiteSpace(row.MentionedUserIdsJson))
            return;
        try
        {
            var list = JsonSerializer.Deserialize<List<string>>(row.MentionedUserIdsJson);
            foreach (var s in list ?? new List<string>())
            {
                if (Guid.TryParse(s, out var g))
                    target.Add(g);
            }
        }
        catch
        {
            /* ignore */
        }
    }

    public sealed class PostNoteBody
    {
        public string? resourceKey { get; set; }
        public string? recordId { get; set; }
        public string? body { get; set; }
        public List<ChatterAttachmentDto>? attachments { get; set; }
        public List<string>? mentionedUserIds { get; set; }
    }

    [HttpPost]
    public async Task<IActionResult> PostNote([FromBody] PostNoteBody body, CancellationToken ct)
    {
        var resourceKey = (body.resourceKey ?? "").Trim();
        var recordId = (body.recordId ?? "").Trim();
        if (resourceKey.Length == 0 || recordId.Length == 0)
            return BadRequest(new { message = "resourceKey and recordId are required." });
        if (!AppRecordMessagePolicy.TryResolvePermissions(resourceKey, out _, out var write))
            return BadRequest(new { message = "Unknown resourceKey." });
        if (!HasPermissionClaim(write))
            return Forbid();

        var text = (body.body ?? "").Trim();
        var attachments = body.attachments ?? new List<ChatterAttachmentDto>();
        var mentionGuids = new List<Guid>();
        foreach (var s in body.mentionedUserIds ?? new List<string>())
        {
            if (Guid.TryParse(s, out var g))
                mentionGuids.Add(g);
        }

        if (text.Length == 0 && attachments.Count == 0 && mentionGuids.Count == 0)
            return BadRequest(new { message = "Message body, attachment, or mention is required." });

        var companyId = GetCompanyIdOrThrow();
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        foreach (var g in mentionGuids.Distinct())
        {
            var exists = await _db.Users.AsNoTracking()
                .AnyAsync(u => u.Id == g && u.CompanyId == companyId, ct);
            if (!exists)
                return BadRequest(new { message = "Invalid mentioned user." });
        }

        await _messages.AddNoteAsync(
            companyId,
            resourceKey,
            recordId,
            text,
            user.Id,
            user.FullName,
            attachments,
            mentionGuids,
            ct);

        return Ok(new { ok = true });
    }

    /// <summary>Users in the current company for @-mention pickers (same permission as reading the thread).</summary>
    [HttpGet("user-suggestions")]
    public async Task<IActionResult> UserSuggestions(
        [FromQuery] string resourceKey,
        [FromQuery] string? q,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(resourceKey))
            return BadRequest(new { message = "resourceKey is required." });
        if (!AppRecordMessagePolicy.TryResolvePermissions(resourceKey, out var read, out _))
            return BadRequest(new { message = "Unknown resourceKey." });
        if (!HasPermissionClaim(read))
            return Forbid();

        var companyId = GetCompanyIdOrThrow();
        var term = (q ?? "").Trim();
        var query = _db.Users.AsNoTracking().Where(u => u.CompanyId == companyId && u.IsActive);
        if (term.Length > 0)
        {
            var t = term;
            query = query.Where(u =>
                u.FullName.Contains(t) || u.Username.Contains(t) ||
                (u.Email != null && u.Email.Contains(t)));
        }

        var rows = await query
            .OrderBy(u => u.FullName)
            .Take(40)
            .Select(u => new { id = u.Id, fullName = u.FullName, username = u.Username })
            .ToListAsync(ct);

        return Ok(rows);
    }

    private static AppRecordMessageDto MapDto(AppRecordMessage x)
    {
        List<ChatterAttachmentDto>? at = null;
        if (!string.IsNullOrWhiteSpace(x.AttachmentsJson))
        {
            try
            {
                at = JsonSerializer.Deserialize<List<ChatterAttachmentDto>>(x.AttachmentsJson);
            }
            catch
            {
                at = null;
            }
        }

        List<string>? mentions = null;
        if (!string.IsNullOrWhiteSpace(x.MentionedUserIdsJson))
        {
            try
            {
                mentions = JsonSerializer.Deserialize<List<string>>(x.MentionedUserIdsJson);
            }
            catch
            {
                mentions = null;
            }
        }

        return new AppRecordMessageDto
        {
            id = x.Id,
            kind = x.Kind,
            systemAction = x.SystemAction,
            body = x.Body,
            authorUserId = x.AuthorUserId,
            authorDisplayName = x.AuthorDisplayName,
            createdAtUtc = x.CreatedAtUtc,
            attachments = at,
            mentionedUserIds = mentions,
        };
    }

    private async Task<User?> GetCurrentUserAsync(CancellationToken ct)
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        return await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
    }

    private int GetCompanyIdOrThrow()
    {
        var raw = User.FindFirstValue("companyId");
        if (!int.TryParse(raw, out var companyId))
            throw new UnauthorizedAccessException("Missing companyId claim.");
        return companyId;
    }

    private bool HasPermissionClaim(string permission) =>
        User.IsInRole("Admin") ||
        User.HasClaim(PermissionCatalog.ClaimPermission, permission);
}

public sealed class AppRecordMessageDto
{
    public Guid id { get; set; }
    public byte kind { get; set; }
    public string? systemAction { get; set; }
    public string body { get; set; } = "";
    public Guid? authorUserId { get; set; }
    public string? authorDisplayName { get; set; }
    public DateTime createdAtUtc { get; set; }
    public List<ChatterAttachmentDto>? attachments { get; set; }
    public List<string>? mentionedUserIds { get; set; }
}

public sealed class AppRecordMessagesLoadDto
{
    public List<AppRecordMessageDto> messages { get; set; } = new();
    public Dictionary<string, MentionUserProfileDto> mentionProfiles { get; set; } = new();
}

public sealed class MentionUserProfileDto
{
    public Guid id { get; set; }
    public string fullName { get; set; } = "";
    public string username { get; set; } = "";
    public string? email { get; set; }
    /// <summary>Reserved for a future Users.Phone column; currently null.</summary>
    public string? phone { get; set; }
}
