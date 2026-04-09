using System.Security.Claims;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/admin/auth")]
public sealed class AdminAuthController : ControllerBase
{
    private readonly AdminPortalDbContext _db;
    private readonly PasswordHasher _hasher;
    private readonly AdminTokenService _tokens;

    public AdminAuthController(AdminPortalDbContext db, PasswordHasher hasher, AdminTokenService tokens)
    {
        _db = db;
        _hasher = hasher;
        _tokens = tokens;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var utcNow = DateTime.UtcNow;

        var email = (request.Email ?? "").Trim();
        var password = request.Password ?? "";
        if (email.Length == 0 || password.Length == 0) return Unauthorized();

        var user = await _db.AdminUsers.FirstOrDefaultAsync(
            u => u.Email.ToLower() == email.ToLower(),
            ct);

        if (user is null || !user.IsActive) return Unauthorized();
        if (!_hasher.VerifyPassword(password, user.PasswordHash)) return Unauthorized();

        var accessToken = _tokens.CreateAccessToken(user, utcNow);
        var (rawRefresh, refreshHash, refreshExpiresAtUtc) =
            await _tokens.CreateAndStoreRefreshTokenAsync(user, utcNow, ct);

        AppendRefreshCookie(rawRefresh, refreshExpiresAtUtc);

        return Ok(new LoginResponse
        {
            AccessToken = accessToken,
            Identity = new IdentityResponse
            {
                Id = user.Id.ToString(),
                FullName = user.FullName,
                Email = user.Email,
                Role = user.Role,
            },
        });
    }

    [Authorize(AuthenticationSchemes = "AdminJwt")]
    [HttpGet("me")]
    public async Task<ActionResult<IdentityResponse>> Me(CancellationToken ct)
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (!Guid.TryParse(sub, out var userId)) return Unauthorized();

        var user = await _db.AdminUsers.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null || !user.IsActive) return Unauthorized();

        return Ok(new IdentityResponse
        {
            Id = user.Id.ToString(),
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
        });
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<ActionResult<RefreshResponse>> Refresh(CancellationToken ct)
    {
        var utcNow = DateTime.UtcNow;

        var rawRefresh = Request.Cookies[AdminTokenService.RefreshTokenCookieName];
        if (string.IsNullOrWhiteSpace(rawRefresh)) return Unauthorized();

        var validated = await _tokens.ValidateRefreshTokenAsync(rawRefresh, utcNow, ct);
        if (validated is null) return Unauthorized();

        var (user, token) = validated.Value;

        var accessToken = _tokens.CreateAccessToken(user, utcNow);
        var (newRaw, newHash, newExpires) = await _tokens.CreateAndStoreRefreshTokenAsync(user, utcNow, ct);

        await _tokens.RotateRefreshTokenAsync(token.TokenHash, newHash, utcNow, ct);

        AppendRefreshCookie(newRaw, newExpires);

        return Ok(new RefreshResponse { AccessToken = accessToken });
    }

    [Authorize(AuthenticationSchemes = "AdminJwt")]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var utcNow = DateTime.UtcNow;

        var rawRefresh = Request.Cookies[AdminTokenService.RefreshTokenCookieName];
        if (!string.IsNullOrWhiteSpace(rawRefresh))
        {
            await _tokens.RevokeRefreshTokenAsync(rawRefresh, utcNow, ct);
        }

        DeleteRefreshCookie();
        return NoContent();
    }

    private void AppendRefreshCookie(string rawToken, DateTime expiresAtUtc)
    {
        Response.Cookies.Append(
            AdminTokenService.RefreshTokenCookieName,
            rawToken,
            new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Expires = expiresAtUtc,
                Path = "/api/admin/auth",
            }
        );
    }

    private void DeleteRefreshCookie()
    {
        Response.Cookies.Delete(AdminTokenService.RefreshTokenCookieName, new CookieOptions
        {
            Path = "/api/admin/auth",
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
        });
    }

    public sealed class LoginRequest
    {
        public string? Email { get; set; }
        public string? Password { get; set; }
    }

    public sealed class LoginResponse
    {
        public string AccessToken { get; set; } = "";
        public IdentityResponse Identity { get; set; } = new();
    }

    public sealed class RefreshResponse
    {
        public string AccessToken { get; set; } = "";
    }

    public sealed class IdentityResponse
    {
        public string Id { get; set; } = "";
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string Role { get; set; } = "";
    }
}

