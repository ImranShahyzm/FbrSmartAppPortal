using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using FbrSmartApp.Api.Auth;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models.AdminPortal;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace FbrSmartApp.Api.Services;

public sealed class AdminTokenService
{
    public const string RefreshTokenCookieName = "adminRefreshToken";

    private readonly AdminPortalDbContext _db;
    private readonly AdminAuthOptions _options;

    public AdminTokenService(AdminPortalDbContext db, IOptions<AdminAuthOptions> options)
    {
        _db = db;
        _options = options.Value;
    }

    public string CreateAccessToken(AdminUser user, DateTime utcNow)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, user.Email),
            new("fullName", user.FullName),
            new(ClaimTypes.Role, user.Role),
            new("adminEmail", user.Email),
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.JwtSigningKey));
        var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _options.JwtIssuer,
            audience: _options.JwtAudience,
            claims: claims,
            notBefore: utcNow,
            expires: utcNow.AddMinutes(_options.AccessTokenMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<(string RawToken, string TokenHash, DateTime ExpiresAtUtc)> CreateAndStoreRefreshTokenAsync(
        AdminUser user,
        DateTime utcNow,
        CancellationToken ct
    )
    {
        var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var hash = HashToken(raw);
        var expires = utcNow.AddDays(_options.RefreshTokenDays);

        var entity = new AdminRefreshToken
        {
            AdminUserId = user.Id,
            TokenHash = hash,
            CreatedAtUtc = utcNow,
            ExpiresAtUtc = expires,
        };

        _db.AdminRefreshTokens.Add(entity);
        await _db.SaveChangesAsync(ct);
        return (raw, hash, expires);
    }

    public async Task<(AdminUser User, AdminRefreshToken Token)?> ValidateRefreshTokenAsync(
        string rawRefreshToken,
        DateTime utcNow,
        CancellationToken ct
    )
    {
        var hash = HashToken(rawRefreshToken);
        var token = await _db.AdminRefreshTokens.AsNoTracking()
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (token is null) return null;
        if (token.IsRevoked) return null;
        if (token.IsExpired(utcNow)) return null;

        var user = await _db.AdminUsers.AsNoTracking().FirstOrDefaultAsync(u => u.Id == token.AdminUserId, ct);
        if (user is null) return null;
        if (!user.IsActive) return null;

        return (user, token);
    }

    public async Task RotateRefreshTokenAsync(
        string oldTokenHash,
        string newTokenHash,
        DateTime utcNow,
        CancellationToken ct
    )
    {
        var token = await _db.AdminRefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == oldTokenHash, ct);
        if (token is null) return;
        token.RevokedAtUtc = utcNow;
        token.ReplacedByTokenHash = newTokenHash;
        await _db.SaveChangesAsync(ct);
    }

    public async Task RevokeRefreshTokenAsync(string rawRefreshToken, DateTime utcNow, CancellationToken ct)
    {
        var hash = HashToken(rawRefreshToken);
        var token = await _db.AdminRefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (token is null) return;
        token.RevokedAtUtc = utcNow;
        await _db.SaveChangesAsync(ct);
    }

    public static string HashToken(string rawToken)
    {
        var bytes = Encoding.UTF8.GetBytes(rawToken);
        var hash = SHA256.HashData(bytes);
        return Convert.ToBase64String(hash);
    }
}

