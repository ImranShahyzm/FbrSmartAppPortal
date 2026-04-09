using FbrSmartApp.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FbrSmartApp.Api.Data;

public static class AdminPortalSeedData
{
    public sealed class SeedAdminUserOptions
    {
        public string Email { get; set; } = "admin@localhost";
        public string Password { get; set; } = "admin";
        public string FullName { get; set; } = "Administrator";
    }

    public sealed class AdminPortalOptions
    {
        public SeedAdminUserOptions SeedAdminUser { get; set; } = new();
    }

    public static async Task EnsureSeededAsync(IServiceProvider services, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AdminPortalDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<PasswordHasher>();
        var options = scope.ServiceProvider.GetRequiredService<IOptions<AdminPortalOptions>>().Value;

        var email = (options.SeedAdminUser.Email ?? "").Trim();
        if (string.IsNullOrWhiteSpace(email)) return;

        var existing = await db.AdminUsers.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email, ct);
        if (existing is not null) return;

        db.AdminUsers.Add(new Models.AdminPortal.AdminUser
        {
            Email = email,
            FullName = (options.SeedAdminUser.FullName ?? "Administrator").Trim(),
            PasswordHash = hasher.HashPassword(options.SeedAdminUser.Password ?? "admin"),
            Role = "Admin",
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);
    }
}

