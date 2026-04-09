using System.Security.Claims;
using System.Text.Json;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models.AdminPortal;
using FbrSmartApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

/// <summary>Admin portal staff accounts (AdminUsers table). React-admin simple-rest dialect.</summary>
[ApiController]
[Route("api/admin/admin-users")]
[Authorize(AuthenticationSchemes = "AdminJwt")]
public sealed class AdminPortalUsersController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly AdminPortalDbContext _db;
    private readonly PasswordHasher _hasher;

    public AdminPortalUsersController(AdminPortalDbContext db, PasswordHasher hasher)
    {
        _db = db;
        _hasher = hasher;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? sort,
        [FromQuery] string? range,
        [FromQuery] string? filter,
        CancellationToken ct)
    {
        IQueryable<AdminUser> query = _db.AdminUsers.AsNoTracking();

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
                            u.FullName.Contains(qq) ||
                            u.Email.Contains(qq) ||
                            u.Role.Contains(qq));
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
            "email" => sortAsc ? query.OrderBy(u => u.Email) : query.OrderByDescending(u => u.Email),
            "role" => sortAsc ? query.OrderBy(u => u.Role) : query.OrderByDescending(u => u.Role),
            "isActive" => sortAsc ? query.OrderBy(u => u.IsActive) : query.OrderByDescending(u => u.IsActive),
            "createdAtUtc" => sortAsc ? query.OrderBy(u => u.CreatedAtUtc) : query.OrderByDescending(u => u.CreatedAtUtc),
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
                // full range
            }
        }

        var take = end - start + 1;
        var pageItems = await query.Skip(start).Take(take).ToListAsync(ct);
        var list = pageItems.Select(MapDto).ToList();

        Response.Headers.ContentRange =
            $"admin-users {start}-{start + Math.Max(list.Count - 1, 0)}/{total}";
        return Ok(list);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetOne(Guid id, CancellationToken ct)
    {
        var user = await _db.AdminUsers.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, ct);
        return user is null ? NotFound() : Ok(MapDto(user));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAdminPortalUserRequest request, CancellationToken ct)
    {
        var email = (request.Email ?? "").Trim();
        var fullName = (request.FullName ?? "").Trim();
        var password = request.Password ?? "";

        if (email.Length == 0 || fullName.Length == 0 || password.Length == 0)
            return BadRequest(new { message = "Email, full name, and password are required." });

        if (await _db.AdminUsers.AnyAsync(u => u.Email.ToLower() == email.ToLower(), ct))
            return Conflict(new { message = "An admin with this email already exists." });

        var role = string.IsNullOrWhiteSpace(request.Role) ? "Admin" : request.Role.Trim();
        if (!IsAllowedRole(role))
            return BadRequest(new { message = "Invalid role." });

        var entity = new AdminUser
        {
            Id = Guid.NewGuid(),
            Email = email,
            FullName = fullName,
            PasswordHash = _hasher.HashPassword(password),
            Role = role,
            IsActive = request.IsActive,
            CreatedAtUtc = DateTime.UtcNow,
        };

        _db.AdminUsers.Add(entity);
        await _db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetOne), new { id = entity.Id }, MapDto(entity));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAdminPortalUserRequest request, CancellationToken ct)
    {
        var selfId = GetSelfAdminId();
        var entity = await _db.AdminUsers.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (entity is null) return NotFound();

        if (selfId == id && request.IsActive == false)
            return BadRequest(new { message = "You cannot deactivate your own account." });

        var email = (request.Email ?? entity.Email).Trim();
        if (email.Length == 0) return BadRequest(new { message = "Email is required." });

        if (await _db.AdminUsers.AnyAsync(
                u => u.Id != id && u.Email.ToLower() == email.ToLower(),
                ct))
            return Conflict(new { message = "An admin with this email already exists." });

        var role = string.IsNullOrWhiteSpace(request.Role) ? entity.Role : request.Role!.Trim();
        if (!IsAllowedRole(role))
            return BadRequest(new { message = "Invalid role." });

        entity.Email = email;
        entity.FullName = string.IsNullOrWhiteSpace(request.FullName) ? entity.FullName : request.FullName.Trim();
        entity.Role = role;
        entity.IsActive = request.IsActive;

        var newPw = request.NewPassword;
        if (!string.IsNullOrWhiteSpace(newPw))
            entity.PasswordHash = _hasher.HashPassword(newPw);

        await _db.SaveChangesAsync(ct);
        return Ok(MapDto(entity));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var selfId = GetSelfAdminId();
        if (selfId == id)
            return BadRequest(new { message = "You cannot delete your own account." });

        var entity = await _db.AdminUsers.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (entity is null) return NotFound();

        _db.AdminUsers.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return Ok(new { id });
    }

    private Guid? GetSelfAdminId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var g) ? g : null;
    }

    private static bool IsAllowedRole(string role)
    {
        var r = role.Trim();
        return r is "Admin" or "SuperAdmin";
    }

    private static object MapDto(AdminUser u) => new
    {
        id = u.Id.ToString(),
        email = u.Email,
        fullName = u.FullName,
        role = u.Role,
        isActive = u.IsActive,
        createdAtUtc = u.CreatedAtUtc,
    };

    public sealed class CreateAdminPortalUserRequest
    {
        public string? Email { get; set; }
        public string? FullName { get; set; }
        public string? Password { get; set; }
        public string? Role { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public sealed class UpdateAdminPortalUserRequest
    {
        public string? Email { get; set; }
        public string? FullName { get; set; }
        public string? Role { get; set; }
        public bool IsActive { get; set; } = true;
        public string? NewPassword { get; set; }
    }
}
