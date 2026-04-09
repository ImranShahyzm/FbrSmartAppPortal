using System.Net.Mail;
using System.Security.Claims;
using System.Security.Cryptography;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using FbrSmartApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PasswordHasher _hasher;
    private readonly TokenService _tokens;
    private readonly IWebHostEnvironment _env;
    private readonly IRegistrationEmailSender _registrationEmail;

    public AuthController(
        AppDbContext db,
        PasswordHasher hasher,
        TokenService tokens,
        IWebHostEnvironment env,
        IRegistrationEmailSender registrationEmail)
    {
        _db = db;
        _hasher = hasher;
        _tokens = tokens;
        _env = env;
        _registrationEmail = registrationEmail;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var utcNow = DateTime.UtcNow;

        var username = (request.Username ?? "").Trim();
        var password = request.Password ?? "";
        if (username.Length == 0 || password.Length == 0)
        {
            return Unauthorized();
        }

        var user = await _db.Users.FirstOrDefaultAsync(
            u => u.Username.ToLower() == username.ToLower(),
            ct);
        if (user is null || !user.IsActive) return Unauthorized();
        if (!_hasher.VerifyPassword(password, user.PasswordHash)) return Unauthorized();

        var companyRow = await _db.Companies.AsNoTracking()
            .Where(c => c.Id == user.CompanyId)
            .Select(c => new { c.Title, c.IsActivated })
            .FirstOrDefaultAsync(ct);

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
                Role = user.Role,
                CompanyId = user.CompanyId,
                CompanyName = companyRow?.Title ?? "",
                CompanyIsActivated = companyRow?.IsActivated ?? true,
                ProfileImage = user.ProfileImage,
            },
        });
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<RefreshResponse>> Refresh(CancellationToken ct)
    {
        var utcNow = DateTime.UtcNow;

        var rawRefresh = Request.Cookies[TokenService.RefreshTokenCookieName];
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

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var utcNow = DateTime.UtcNow;

        var rawRefresh = Request.Cookies[TokenService.RefreshTokenCookieName];
        if (!string.IsNullOrWhiteSpace(rawRefresh))
        {
            await _tokens.RevokeRefreshTokenAsync(rawRefresh, utcNow, ct);
        }

        DeleteRefreshCookie();
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<IdentityResponse>> Me(CancellationToken ct)
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (!Guid.TryParse(sub, out var userId)) return Unauthorized();

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null || !user.IsActive) return Unauthorized();

        var companyRow = await _db.Companies.AsNoTracking()
            .Where(c => c.Id == user.CompanyId)
            .Select(c => new { c.Title, c.IsActivated })
            .FirstOrDefaultAsync(ct);

        return Ok(new IdentityResponse
        {
            Id = user.Id.ToString(),
            FullName = user.FullName,
            Role = user.Role,
            CompanyId = user.CompanyId,
            CompanyName = companyRow?.Title ?? "",
            CompanyIsActivated = companyRow?.IsActivated ?? true,
            ProfileImage = user.ProfileImage,
        });
    }

    [AllowAnonymous]
    [HttpPost("register-company")]
    public async Task<ActionResult<RegisterCompanyResponse>> RegisterCompany(
        [FromBody] RegisterCompanyRequest request,
        CancellationToken ct)
    {
        var title = (request.Title ?? "").Trim();
        var shortTitle = (request.ShortTitle ?? "").Trim();
        var ntn = (request.NtnNo ?? "").Trim();
        var signInEmailRaw = (request.Username ?? "").Trim();
        var fullName = (request.FullName ?? "").Trim();

        if (title.Length == 0) return BadRequest(new { message = "Company name is required." });
        if (title.Length > 100) return BadRequest(new { message = "Company name is too long." });
        if (shortTitle.Length == 0) return BadRequest(new { message = "Short title is required." });
        if (shortTitle.Length > 10) return BadRequest(new { message = "Short title must be at most 10 characters." });
        if (ntn.Length == 0) return BadRequest(new { message = "NTN is required." });
        if (signInEmailRaw.Length == 0) return BadRequest(new { message = "Sign-in email is required." });
        if (signInEmailRaw.Length > 100) return BadRequest(new { message = "Sign-in email is too long." });
        if (fullName.Length == 0) return BadRequest(new { message = "Full name is required." });
        if (fullName.Length > 200) return BadRequest(new { message = "Full name is too long." });

        string signInEmailNorm;
        try
        {
            signInEmailNorm = new MailAddress(signInEmailRaw).Address;
        }
        catch (FormatException)
        {
            return BadRequest(new { message = "Sign-in email is not valid." });
        }

        if (request.EmployeeCount is int ec && ec < 0)
            return BadRequest(new { message = "Number of employees cannot be negative." });

        if (request.FbrProvinceId is int pid)
        {
            var provOk = await _db.FbrProvinces.AsNoTracking().AnyAsync(p => p.Id == pid, ct);
            if (!provOk) return BadRequest(new { message = "Invalid FBR province." });
        }

        var ntnNorm = ntn.ToLowerInvariant();
        var ntnTaken = await _db.Companies.AsNoTracking()
            .AnyAsync(
                c => c.NTNNo != null && c.NTNNo.Trim().ToLower() == ntnNorm,
                ct);
        if (ntnTaken)
            return Conflict(new { message = "A company with this NTN is already registered." });

        if (await _db.Users.AsNoTracking()
                .AnyAsync(u => u.Username.ToLower() == signInEmailNorm.ToLower(), ct))
            return Conflict(new { message = "This sign-in email is already registered." });

        var tempPassword = GenerateTemporaryPassword();
        var passwordHash = _hasher.HashPassword(tempPassword);
        var newCompanyId = 0;

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            var company = new Company
            {
                Title = title,
                ShortTitle = shortTitle,
                Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
                Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim(),
                Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
                website = string.IsNullOrWhiteSpace(request.Website) ? null : request.Website.Trim(),
                NTNNo = ntn,
                St_Registration = string.IsNullOrWhiteSpace(request.St_Registration)
                    ? null
                    : request.St_Registration.Trim(),
                FbrProvinceId = request.FbrProvinceId,
                EnableSandBox = true,
                FbrTokenSandBox = null,
                FbrTokenProduction = null,
                Inactive = false,
                IsActivated = false,
                EmployeeCount = request.EmployeeCount,
            };

            _db.Companies.Add(company);
            await _db.SaveChangesAsync(ct);

            if (!string.IsNullOrWhiteSpace(request.LogoBase64))
            {
                var path = await SaveLogoAsync(company.Id, request.LogoBase64!, ct);
                company.CompanyImage = path;
                await _db.SaveChangesAsync(ct);
            }

            var user = new User
            {
                CompanyId = company.Id,
                Username = signInEmailNorm,
                Email = signInEmailNorm,
                FullName = fullName,
                PasswordHash = passwordHash,
                Role = "Admin",
                IsActive = true,
                AllowedCompanyIdsJson = $"[{company.Id}]",
                DefaultCompanyId = company.Id,
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync(ct);

            newCompanyId = company.Id;
            await tx.CommitAsync(ct);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }

        await _registrationEmail.SendRegistrationWelcomeAsync(
            signInEmailNorm,
            fullName,
            title,
            signInEmailNorm,
            tempPassword,
            ct);

        return Ok(new RegisterCompanyResponse
        {
            Username = signInEmailNorm,
            TemporaryPassword = tempPassword,
            CompanyId = newCompanyId,
            Message =
                "Registration submitted. Your company is waiting for approval. A confirmation email with your sign-in details has been sent when mail is configured.",
        });
    }

    private static string GenerateTemporaryPassword()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        var bytes = RandomNumberGenerator.GetBytes(14);
        var ch = new char[bytes.Length];
        for (var i = 0; i < bytes.Length; i++)
            ch[i] = chars[bytes[i] % chars.Length];
        return new string(ch);
    }

    private async Task<string> SaveLogoAsync(int companyId, string logoBase64, CancellationToken ct)
    {
        var base64 = logoBase64;
        var ext = "png";
        var comma = logoBase64.IndexOf(',');
        if (logoBase64.StartsWith("data:", StringComparison.OrdinalIgnoreCase) && comma >= 0)
        {
            var header = logoBase64.Substring(0, comma);
            base64 = logoBase64[(comma + 1)..];
            if (header.Contains("image/jpeg", StringComparison.OrdinalIgnoreCase)) ext = "jpg";
            if (header.Contains("image/png", StringComparison.OrdinalIgnoreCase)) ext = "png";
            if (header.Contains("image/webp", StringComparison.OrdinalIgnoreCase)) ext = "webp";
        }

        var bytes = Convert.FromBase64String(base64);

        var uploads = Path.Combine(_env.ContentRootPath, "uploads", "companies", companyId.ToString());
        Directory.CreateDirectory(uploads);

        var fileName = $"logo.{ext}";
        var fullPath = Path.Combine(uploads, fileName);
        await System.IO.File.WriteAllBytesAsync(fullPath, bytes, ct);

        return Path.Combine("uploads", "companies", companyId.ToString(), fileName).Replace('\\', '/');
    }

    private void AppendRefreshCookie(string rawToken, DateTime expiresAtUtc)
    {
        Response.Cookies.Append(
            TokenService.RefreshTokenCookieName,
            rawToken,
            new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Expires = expiresAtUtc,
                Path = "/api/auth",
            }
        );
    }

    private void DeleteRefreshCookie()
    {
        Response.Cookies.Delete(TokenService.RefreshTokenCookieName, new CookieOptions
        {
            Path = "/api/auth",
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
        });
    }

    public sealed class LoginRequest
    {
        public string? Username { get; set; }
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
        public string Role { get; set; } = "";
        public int CompanyId { get; set; }
        public string CompanyName { get; set; } = "";
        public bool CompanyIsActivated { get; set; } = true;
        public string? ProfileImage { get; set; }
    }

    public sealed class RegisterCompanyRequest
    {
        public string? Title { get; set; }
        public string? ShortTitle { get; set; }
        public string? NtnNo { get; set; }
        public string? St_Registration { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Website { get; set; }
        public int? FbrProvinceId { get; set; }
        public int? EmployeeCount { get; set; }
        public string? LogoBase64 { get; set; }

        /// <summary>Sign-in email (stored as user name; must be unique).</summary>
        public string? Username { get; set; }
        public string? FullName { get; set; }
    }

    public sealed class RegisterCompanyResponse
    {
        public string Username { get; set; } = "";
        public string TemporaryPassword { get; set; } = "";
        public int CompanyId { get; set; }
        public string Message { get; set; } = "";
    }
}

