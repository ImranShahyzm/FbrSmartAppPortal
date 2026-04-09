using System.Security.Claims;
using System.Text.Json;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using FbrSmartApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public sealed class UsersController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly AppDbContext _db;
    private readonly PasswordHasher _hasher;
    private readonly IWebHostEnvironment _env;

    public UsersController(AppDbContext db, PasswordHasher hasher, IWebHostEnvironment env)
    {
        _db = db;
        _hasher = hasher;
        _env = env;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? sort,
        [FromQuery] string? range,
        [FromQuery] string? filter,
        CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();

        if (!string.IsNullOrWhiteSpace(filter))
        {
            try
            {
                using var doc = JsonDocument.Parse(filter);
                if (doc.RootElement.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.Array)
                {
                    var ids = new List<Guid>();
                    foreach (var el in idEl.EnumerateArray())
                    {
                        if (el.ValueKind == JsonValueKind.String &&
                            Guid.TryParse(el.GetString(), out var g))
                            ids.Add(g);
                    }

                    if (ids.Count > 0)
                    {
                        var rows = await _db.Users.AsNoTracking()
                            .Where(u => u.CompanyId == companyId && ids.Contains(u.Id))
                            .ToListAsync(ct);
                        var data = rows.Select(MapDto).ToList();
                        var n = data.Count;
                        Response.Headers.ContentRange = $"users 0-{Math.Max(n - 1, 0)}/{n}";
                        return Ok(data);
                    }
                }
            }
            catch (JsonException)
            {
                // fall through to full list
            }
        }

        var query = _db.Users.AsNoTracking().Where(u => u.CompanyId == companyId);

        if (!string.IsNullOrWhiteSpace(filter))
        {
            try
            {
                using var doc = JsonDocument.Parse(filter);
                if (doc.RootElement.TryGetProperty("q", out var qEl))
                {
                    var q = qEl.GetString();
                    if (!string.IsNullOrWhiteSpace(q))
                    {
                        var qq = q.Trim();
                        query = query.Where(u =>
                            u.Username.Contains(qq) ||
                            u.FullName.Contains(qq) ||
                            (u.Email != null && u.Email.Contains(qq)));
                    }
                }
            }
            catch (JsonException)
            {
                // ignore
            }
        }

        var sortField = "fullName";
        var sortAsc = true;
        if (!string.IsNullOrWhiteSpace(sort))
        {
            try
            {
                var arr = JsonSerializer.Deserialize<string[]>(sort, JsonOpts);
                if (arr is { Length: >= 1 })
                {
                    sortField = arr[0] ?? sortField;
                    if (arr.Length >= 2 &&
                        string.Equals(arr[1], "DESC", StringComparison.OrdinalIgnoreCase))
                        sortAsc = false;
                }
            }
            catch (JsonException)
            {
                // defaults
            }
        }

        query = sortField switch
        {
            "username" => sortAsc ? query.OrderBy(u => u.Username) : query.OrderByDescending(u => u.Username),
            "email" => sortAsc ? query.OrderBy(u => u.Email) : query.OrderByDescending(u => u.Email),
            "isActive" => sortAsc ? query.OrderBy(u => u.IsActive) : query.OrderByDescending(u => u.IsActive),
            _ => sortAsc ? query.OrderBy(u => u.FullName) : query.OrderByDescending(u => u.FullName),
        };

        var total = await query.CountAsync(ct);

        var start = 0;
        var end = Math.Max(total - 1, 0);
        if (!string.IsNullOrWhiteSpace(range))
        {
            try
            {
                var r = JsonSerializer.Deserialize<int[]>(range, JsonOpts);
                if (r is { Length: >= 2 })
                {
                    start = Math.Max(0, r[0]);
                    end = Math.Max(start, r[1]);
                }
            }
            catch (JsonException)
            {
                // use full range
            }
        }

        var take = end - start + 1;
        var pageItems = await query.Skip(start).Take(take).ToListAsync(ct);
        var list = pageItems.Select(MapDto).ToList();

        Response.Headers.ContentRange = $"users {start}-{start + Math.Max(list.Count - 1, 0)}/{total}";
        return Ok(list);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetOne(Guid id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var user = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id && u.CompanyId == companyId, ct);
        if (user is null) return NotFound();
        return Ok(MapDto(user));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();

        var username = (request.Username ?? "").Trim();
        var fullName = (request.FullName ?? "").Trim();
        var password = request.InitialPassword ?? "";

        if (username.Length == 0 || fullName.Length == 0 || password.Length == 0)
            return BadRequest(new { message = "Username, full name, and initial password are required." });

        if (await _db.Users.AnyAsync(u => u.Username == username, ct))
            return Conflict(new { message = "Username already exists." });

        var allowed = NormalizeAllowedCompanyIds(request.AllowedCompanyIds, companyId);
        var defaultCo = request.DefaultCompanyId ?? companyId;
        if (!allowed.Contains(defaultCo))
            allowed.Add(defaultCo);

        var entity = new User
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Username = username,
            FullName = fullName,
            PasswordHash = _hasher.HashPassword(password),
            Role = string.IsNullOrWhiteSpace(request.Role) ? "User" : request.Role!.Trim(),
            IsActive = true,
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            PreferredLanguage = string.IsNullOrWhiteSpace(request.PreferredLanguage)
                ? "en-US"
                : request.PreferredLanguage!.Trim(),
            TimeZoneId = string.IsNullOrWhiteSpace(request.TimeZoneId)
                ? "Asia/Karachi"
                : request.TimeZoneId!.Trim(),
            OnboardingEnabled = request.OnboardingEnabled,
            EmailSignature = request.EmailSignature,
            CalendarDefaultPrivacy = string.IsNullOrWhiteSpace(request.CalendarDefaultPrivacy)
                ? "public"
                : request.CalendarDefaultPrivacy!.Trim(),
            NotificationChannel = request.NotificationChannel is "inApp" ? "inApp" : "email",
            AllowedCompanyIdsJson = JsonSerializer.Serialize(allowed),
            DefaultCompanyId = defaultCo,
        };

        _db.Users.Add(entity);
        await _db.SaveChangesAsync(ct);

        if (!string.IsNullOrWhiteSpace(request.ProfileImageBase64))
        {
            entity.ProfileImage = await SaveProfileImageAsync(companyId, entity.Id, request.ProfileImageBase64!, ct);
            await _db.SaveChangesAsync(ct);
        }

        return CreatedAtAction(nameof(GetOne), new { id = entity.Id }, MapDto(entity));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var entity = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.CompanyId == companyId, ct);
        if (entity is null) return NotFound();

        var selfId = GetSelfUserId();
        if (selfId is not null && selfId == id && request.IsActive == false)
            return BadRequest(new { message = "You cannot archive your own account." });

        var username = (request.Username ?? entity.Username).Trim();
        if (username.Length == 0) return BadRequest(new { message = "Username is required." });

        if (await _db.Users.AnyAsync(u => u.Username == username && u.Id != id, ct))
            return Conflict(new { message = "Username already exists." });

        var allowed = NormalizeAllowedCompanyIds(request.AllowedCompanyIds, companyId);
        var defaultCo = request.DefaultCompanyId ?? entity.DefaultCompanyId ?? companyId;
        if (!allowed.Contains(defaultCo))
            allowed.Add(defaultCo);

        entity.Username = username;
        entity.FullName = string.IsNullOrWhiteSpace(request.FullName) ? entity.FullName : request.FullName.Trim();
        entity.Role = string.IsNullOrWhiteSpace(request.Role) ? entity.Role : request.Role!.Trim();
        entity.IsActive = request.IsActive;
        entity.Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        entity.PreferredLanguage = string.IsNullOrWhiteSpace(request.PreferredLanguage)
            ? entity.PreferredLanguage
            : request.PreferredLanguage!.Trim();
        entity.TimeZoneId = string.IsNullOrWhiteSpace(request.TimeZoneId)
            ? entity.TimeZoneId
            : request.TimeZoneId!.Trim();
        entity.OnboardingEnabled = request.OnboardingEnabled;
        entity.EmailSignature = request.EmailSignature;
        entity.CalendarDefaultPrivacy = string.IsNullOrWhiteSpace(request.CalendarDefaultPrivacy)
            ? entity.CalendarDefaultPrivacy
            : request.CalendarDefaultPrivacy!.Trim();
        entity.NotificationChannel = request.NotificationChannel is "inApp" ? "inApp" : "email";
        entity.AllowedCompanyIdsJson = JsonSerializer.Serialize(allowed);
        entity.DefaultCompanyId = defaultCo;

        if (!string.IsNullOrWhiteSpace(request.ProfileImageBase64))
        {
            entity.ProfileImage = await SaveProfileImageAsync(companyId, entity.Id, request.ProfileImageBase64!, ct);
        }

        await _db.SaveChangesAsync(ct);
        return Ok(MapDto(entity));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var selfId = GetSelfUserId();
        if (selfId is not null && selfId == id)
            return BadRequest(new { message = "You cannot delete your own account." });

        var entity = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.CompanyId == companyId, ct);
        if (entity is null) return NotFound();

        _db.Users.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return Ok(new { id });
    }

    [HttpPost("{id:guid}/duplicate")]
    public async Task<IActionResult> Duplicate(Guid id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var src = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id && u.CompanyId == companyId, ct);
        if (src is null) return NotFound();

        var baseName = src.Username + "_copy";
        var username = baseName;
        var n = 1;
        while (await _db.Users.AnyAsync(u => u.Username == username, ct))
        {
            n++;
            username = baseName + n;
        }

        var tempPassword = "ChangeMe!" + Random.Shared.Next(100000, 999999);
        var clone = new User
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Username = username,
            FullName = string.IsNullOrWhiteSpace(src.FullName) ? username : $"{src.FullName} (copy)",
            PasswordHash = _hasher.HashPassword(tempPassword),
            Role = src.Role,
            IsActive = true,
            Email = src.Email,
            PreferredLanguage = src.PreferredLanguage,
            TimeZoneId = src.TimeZoneId,
            OnboardingEnabled = src.OnboardingEnabled,
            EmailSignature = src.EmailSignature,
            CalendarDefaultPrivacy = src.CalendarDefaultPrivacy,
            NotificationChannel = src.NotificationChannel,
            AllowedCompanyIdsJson = src.AllowedCompanyIdsJson,
            DefaultCompanyId = src.DefaultCompanyId ?? src.CompanyId,
            ProfileImage = null,
        };

        _db.Users.Add(clone);
        await _db.SaveChangesAsync(ct);

        return Ok(new { user = MapDto(clone), initialPassword = tempPassword });
    }

    [HttpPost("{id:guid}/password")]
    public async Task<IActionResult> ChangePassword(Guid id, [FromBody] ChangePasswordRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var entity = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.CompanyId == companyId, ct);
        if (entity is null) return NotFound();

        var password = request.NewPassword ?? "";
        if (password.Length < 6)
            return BadRequest(new { message = "Password must be at least 6 characters." });

        entity.PasswordHash = _hasher.HashPassword(password);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private Guid? GetSelfUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var g) ? g : null;
    }

    private int GetCompanyIdOrThrow()
    {
        var raw = User.FindFirstValue("companyId");
        if (!int.TryParse(raw, out var companyId))
            throw new UnauthorizedAccessException("Missing companyId claim.");
        return companyId;
    }

    private async Task<string> SaveProfileImageAsync(int companyId, Guid userId, string base64DataUrl, CancellationToken ct)
    {
        var base64 = base64DataUrl;
        var ext = "png";
        var comma = base64DataUrl.IndexOf(',');
        if (base64DataUrl.StartsWith("data:", StringComparison.OrdinalIgnoreCase) && comma >= 0)
        {
            var header = base64DataUrl[..comma];
            base64 = base64DataUrl[(comma + 1)..];
            if (header.Contains("image/jpeg", StringComparison.OrdinalIgnoreCase)) ext = "jpg";
            if (header.Contains("image/png", StringComparison.OrdinalIgnoreCase)) ext = "png";
            if (header.Contains("image/webp", StringComparison.OrdinalIgnoreCase)) ext = "webp";
        }

        var bytes = Convert.FromBase64String(base64);
        var dir = Path.Combine(_env.ContentRootPath, "uploads", "users", companyId.ToString(), userId.ToString("N"));
        Directory.CreateDirectory(dir);

        var fileName = $"avatar.{ext}";
        var fullPath = Path.Combine(dir, fileName);
        await System.IO.File.WriteAllBytesAsync(fullPath, bytes, ct);

        return Path.Combine("uploads", "users", companyId.ToString(), userId.ToString("N"), fileName)
            .Replace('\\', '/');
    }

    private static List<int> NormalizeAllowedCompanyIds(int[]? ids, int companyId)
    {
        var list = ids?.Where(x => x > 0).Distinct().ToList() ?? new List<int>();
        if (list.Count == 0)
            list.Add(companyId);
        return list;
    }

    private static int[] ParseAllowedCompanyIds(string json)
    {
        try
        {
            var arr = JsonSerializer.Deserialize<int[]>(json, JsonOpts);
            return arr ?? Array.Empty<int>();
        }
        catch (JsonException)
        {
            return Array.Empty<int>();
        }
    }

    private object MapDto(User u) => new
    {
        id = u.Id.ToString(),
        companyId = u.CompanyId,
        username = u.Username,
        fullName = u.FullName,
        role = u.Role,
        isActive = u.IsActive,
        email = u.Email,
        preferredLanguage = u.PreferredLanguage,
        timeZoneId = u.TimeZoneId,
        onboardingEnabled = u.OnboardingEnabled,
        emailSignature = u.EmailSignature,
        calendarDefaultPrivacy = u.CalendarDefaultPrivacy,
        notificationChannel = u.NotificationChannel,
        allowedCompanyIds = ParseAllowedCompanyIds(u.AllowedCompanyIdsJson),
        defaultCompanyId = u.DefaultCompanyId ?? u.CompanyId,
        createdAtUtc = u.CreatedAtUtc.ToString("O"),
        profileImage = u.ProfileImage,
    };

    public sealed class CreateUserRequest
    {
        public string? Username { get; set; }
        public string? FullName { get; set; }
        public string? InitialPassword { get; set; }
        public string? Role { get; set; }
        public string? Email { get; set; }
        public string? PreferredLanguage { get; set; }
        public string? TimeZoneId { get; set; }
        public bool OnboardingEnabled { get; set; }
        public string? EmailSignature { get; set; }
        public string? CalendarDefaultPrivacy { get; set; }
        public string? NotificationChannel { get; set; }
        public int[]? AllowedCompanyIds { get; set; }
        public int? DefaultCompanyId { get; set; }
        public string? ProfileImageBase64 { get; set; }
    }

    public sealed class UpdateUserRequest
    {
        public string? Username { get; set; }
        public string? FullName { get; set; }
        public string? Role { get; set; }
        public bool IsActive { get; set; }
        public string? Email { get; set; }
        public string? PreferredLanguage { get; set; }
        public string? TimeZoneId { get; set; }
        public bool OnboardingEnabled { get; set; }
        public string? EmailSignature { get; set; }
        public string? CalendarDefaultPrivacy { get; set; }
        public string? NotificationChannel { get; set; }
        public int[]? AllowedCompanyIds { get; set; }
        public int? DefaultCompanyId { get; set; }
        public string? ProfileImageBase64 { get; set; }
    }

    public sealed class ChangePasswordRequest
    {
        public string? NewPassword { get; set; }
    }
}
