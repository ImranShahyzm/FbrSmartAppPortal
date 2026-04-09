using FbrSmartApp.Api.Auth;
using FbrSmartApp.Api.Models;
using FbrSmartApp.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FbrSmartApp.Api.Data;

public static class SeedData
{
    public static async Task EnsureSeededAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<PasswordHasher>();
        var options = scope.ServiceProvider.GetRequiredService<IOptions<AuthOptions>>().Value;

        if (string.IsNullOrWhiteSpace(options.JwtSigningKey) || options.JwtSigningKey.Length < 32)
        {
            throw new InvalidOperationException("Auth:JwtSigningKey must be set to a strong value (min 32 chars).");
        }

        var adminUsername = options.AdminUser.Username.Trim();
        if (string.IsNullOrWhiteSpace(adminUsername)) return;

        // Ensure exactly one "dummy" company exists (users can edit, not create)
        var company = await db.Companies.OrderBy(c => c.Id).FirstOrDefaultAsync();
        if (company is null)
        {
            company = new Company
            {
                Title = "Default Company",
                ShortTitle = "DEF",
                Inactive = false,
                IsActivated = true,
                EnableSandBox = true,
                FbrTokenSandBox = null,
                FbrTokenProduction = null,
            };
            db.Companies.Add(company);
            await db.SaveChangesAsync();
        }

        // Minimal FBR config seed (used by Product Registration form)
        if (!await db.FbrSaleTypes.AnyAsync())
        {
            db.FbrSaleTypes.AddRange(
                new FbrSaleType { Id = 1, Description = "Sales (Default)", IsActive = true },
                new FbrSaleType { Id = 2, Description = "Services", IsActive = true },
                new FbrSaleType { Id = 3, Description = "Export", IsActive = true }
            );
        }

        if (!await db.FbrRates.AnyAsync())
        {
            db.FbrRates.AddRange(
                new FbrRate { Id = 101, RateDesc = "Rate 18% (Sales Tax)", RateValue = 18m, IsActive = true },
                new FbrRate { Id = 102, RateDesc = "Rate 16% (Services)", RateValue = 16m, IsActive = true },
                new FbrRate { Id = 103, RateDesc = "Rate 0% (Zero Rated)", RateValue = 0m, IsActive = true }
            );
        }

        if (!await db.FbrSroSchedules.AnyAsync())
        {
            db.FbrSroSchedules.Add(new FbrSroSchedule
            {
                Id = 1001,
                SroDesc = "SRO Sample Schedule",
                SerNo = "SRO-1001",
                IsActive = true
            });
        }

        if (!await db.FbrSroItems.AnyAsync())
        {
            db.FbrSroItems.AddRange(
                new FbrSroItem { Id = 17112, SroId = 1001, SroItemDesc = "45(i)", IsActive = true },
                new FbrSroItem { Id = 17113, SroId = 1001, SroItemDesc = "45(ii)", IsActive = true }
            );
        }

        // Seed provinces for default company + global (CompanyID=0)
        if (!await db.FbrProvinces.AnyAsync())
        {
            db.FbrProvinces.AddRange(
                new FbrProvinceData { Provincename = "Punjab", CompanyID = company.Id },
                new FbrProvinceData { Provincename = "Balochistan", CompanyID = company.Id },
                new FbrProvinceData { Provincename = "Sindh", CompanyID = company.Id },
                new FbrProvinceData { Provincename = "AZAD JAMMU AND KASHMIR", CompanyID = 0 },
                new FbrProvinceData { Provincename = "CAPITAL TERRITORY", CompanyID = 0 },
                new FbrProvinceData { Provincename = "KHYBER PAKHTUNKHWA", CompanyID = 0 },
                new FbrProvinceData { Provincename = "GILGIT BALTISTAN", CompanyID = 0 }
            );
        }

        await db.SaveChangesAsync();

        var existing = await db.Users.FirstOrDefaultAsync(u => u.Username == adminUsername);
        if (existing is not null) return;

        var admin = new User
        {
            CompanyId = company.Id,
            Username = adminUsername,
            FullName = options.AdminUser.FullName.Trim(),
            PasswordHash = hasher.HashPassword(options.AdminUser.Password),
            Role = "Admin",
            IsActive = true,
        };

        db.Users.Add(admin);
        await db.SaveChangesAsync();
    }
}

