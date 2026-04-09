using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using FbrSmartApp.Api.Auth;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace FbrSmartApp.Api.Services;

public sealed class TokenService
{
    private readonly AppDbContext _db;
    private readonly AuthOptions _options;

    public const string RefreshTokenCookieName = "refreshToken";

    public TokenService(AppDbContext db, IOptions<AuthOptions> options)
    {
        _db = db;
        _options = options.Value;
    }

    public string CreateAccessToken(User user, DateTime utcNow)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, user.Username),
            new("fullName", user.FullName),
            new(ClaimTypes.Role, user.Role),
            new("companyId", user.CompanyId.ToString()),
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
        User user,
        DateTime utcNow,
        CancellationToken ct
    )
    {
        var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var hash = HashToken(raw);
        var expires = utcNow.AddDays(_options.RefreshTokenDays);

        var entity = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = hash,
            CreatedAtUtc = utcNow,
            ExpiresAtUtc = expires,
        };

        _db.RefreshTokens.Add(entity);
        await _db.SaveChangesAsync(ct);

        return (raw, hash, expires);
    }

    public async Task<(User User, RefreshToken Token)?> ValidateRefreshTokenAsync(
        string rawRefreshToken,
        DateTime utcNow,
        CancellationToken ct
    )
    {
        var hash = HashToken(rawRefreshToken);
        var token = await _db.RefreshTokens
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (token is null) return null;
        if (token.IsRevoked) return null;
        if (token.IsExpired(utcNow)) return null;

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == token.UserId, ct);
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
        var token = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == oldTokenHash, ct);
        if (token is null) return;

        token.RevokedAtUtc = utcNow;
        token.ReplacedByTokenHash = newTokenHash;
        await _db.SaveChangesAsync(ct);
    }

    public async Task RevokeRefreshTokenAsync(string rawRefreshToken, DateTime utcNow, CancellationToken ct)
    {
        var hash = HashToken(rawRefreshToken);
        var token = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
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

