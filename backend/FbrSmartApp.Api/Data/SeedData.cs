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

        const string fullAccountingAccess =
            """{"modules":{"accounting":{"chartOfAccounts":{"read":true,"write":true}}}}""";

        foreach (var u in await db.Users.ToListAsync())
        {
            if (string.Equals(u.Role, "Admin", StringComparison.OrdinalIgnoreCase) &&
                string.IsNullOrWhiteSpace(u.AccessRightsJson))
            {
                u.AccessRightsJson = fullAccountingAccess;
            }
        }

        if (!await db.GlAccountTypes.AnyAsync())
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                SET IDENTITY_INSERT dbo.GLAccontType ON;
                INSERT INTO dbo.GLAccontType (AccountTypeID, Title, MainParent, ReportingHead, OrderBy) VALUES
                (1, 'Balance Sheet', NULL, N'Balance Sheet', 1),
                (2, 'Assets', 1, N'Balance Sheet', 1),
                (3, 'Liabilities', 1, N'Balance Sheet', 2),
                (4, 'Equity', 1, N'Balance Sheet', 3),
                (5, N'Profit & Loss', NULL, N'Profit & Loss', 2),
                (6, 'Income', 5, N'Profit & Loss', 1),
                (7, 'Expense', 5, N'Profit & Loss', 2),
                (8, 'Receivable', 2, N'Balance Sheet', 1),
                (9, 'Bank and Cash', 2, N'Balance Sheet', 2),
                (10, 'Current Assets', 2, N'Balance Sheet', 3),
                (11, 'Non-current Assets', 2, N'Balance Sheet', 4),
                (12, 'Prepayments', 2, N'Balance Sheet', 5),
                (13, 'Fixed Assets', 2, N'Balance Sheet', 6),
                (14, 'Payable', 3, N'Balance Sheet', 1),
                (15, 'Credit Card', 3, N'Balance Sheet', 2),
                (16, 'Current Liabilities', 3, N'Balance Sheet', 3),
                (17, 'Non-current Liabilities', 3, N'Balance Sheet', 4),
                (18, 'Equity', 4, N'Balance Sheet', 1),
                (19, 'Current Year Earnings', 4, N'Balance Sheet', 2),
                (20, 'Income', 6, N'Profit & Loss', 1),
                (21, 'Other Income', 6, N'Profit & Loss', 2),
                (22, 'Expense', 7, N'Profit & Loss', 1),
                (23, 'Direct Costs', 7, N'Profit & Loss', 2),
                (24, 'Depreciation', 7, N'Profit & Loss', 3),
                (25, 'Other Expense', 7, N'Profit & Loss', 4);
                SET IDENTITY_INSERT dbo.GLAccontType OFF;
                """
            );
        }

        if (!await db.GlChartOfAccounts.AnyAsync())
        {
            db.GlChartOfAccounts.Add(
                new GlChartOfAccount
                {
                    GlCode = "1000",
                    GlTitle = "Sample account",
                    GlType = 10,
                    CompanyId = company.Id,
                    Status = true,
                    ReadOnly = false,
                    AllowReconciliation = false,
                    AccountLevelOne = "1",
                });
        }

        await db.SaveChangesAsync();

        var existing = await db.Users.FirstOrDefaultAsync(u => u.Username == adminUsername);
        if (existing is null)
        {
            var admin = new User
            {
                CompanyId = company.Id,
                Username = adminUsername,
                FullName = options.AdminUser.FullName.Trim(),
                PasswordHash = hasher.HashPassword(options.AdminUser.Password),
                Role = "Admin",
                IsActive = true,
                AccessRightsJson = fullAccountingAccess,
            };

            db.Users.Add(admin);
            await db.SaveChangesAsync();
        }

        await EnsureFullAccessSecurityGroupAsync(db, company);
    }

    /// <summary>
    /// Idempotent: one "Full Access" group per company with catalog-wide rights; Admin users are linked for UI consistency (effective perms still come from Admin role + materializer).
    /// </summary>
    private static async Task EnsureFullAccessSecurityGroupAsync(AppDbContext db, Company company)
    {
        const string fullAccessName = "Full Access";
        var existingGroup = await db.SecurityGroups
            .FirstOrDefaultAsync(x => x.CompanyId == company.Id && x.Name == fullAccessName);
        if (existingGroup is null)
        {
            var g = new SecurityGroup
            {
                CompanyId = company.Id,
                Name = fullAccessName,
                ApplicationScope = "All",
                ShareGroup = false,
            };
            db.SecurityGroups.Add(g);
            await db.SaveChangesAsync();

            foreach (var app in PermissionCatalog.Apps)
            {
                foreach (var res in app.Resources)
                {
                    db.GroupAccessRights.Add(new GroupAccessRight
                    {
                        SecurityGroupId = g.Id,
                        DisplayName = $"{app.DisplayName}: {res.Label}",
                        PermissionsPrefix = app.PermissionsPrefix,
                        ModelKey = res.Key,
                        CanRead = true,
                        CanWrite = true,
                        CanCreate = true,
                        CanDelete = true,
                    });
                }
            }

            await db.SaveChangesAsync();
            existingGroup = g;
        }

        // Idempotent: grant new PermissionCatalog resources to Full Access after upgrades.
        var fullAccess = existingGroup!;
        foreach (var app in PermissionCatalog.Apps)
        {
            foreach (var res in app.Resources)
            {
                var exists = await db.GroupAccessRights.AnyAsync(x =>
                    x.SecurityGroupId == fullAccess.Id &&
                    x.PermissionsPrefix == app.PermissionsPrefix &&
                    x.ModelKey == res.Key);
                if (exists) continue;
                db.GroupAccessRights.Add(new GroupAccessRight
                {
                    SecurityGroupId = fullAccess.Id,
                    DisplayName = $"{app.DisplayName}: {res.Label}",
                    PermissionsPrefix = app.PermissionsPrefix,
                    ModelKey = res.Key,
                    CanRead = true,
                    CanWrite = true,
                    CanCreate = true,
                    CanDelete = true,
                });
            }
        }
        await db.SaveChangesAsync();

        var adminUsers = await db.Users
            .Where(u => u.CompanyId == company.Id && u.Role == "Admin")
            .Select(u => u.Id)
            .ToListAsync();
        foreach (var uid in adminUsers)
        {
            if (!await db.UserSecurityGroups.AnyAsync(
                    x => x.UserId == uid && x.SecurityGroupId == existingGroup!.Id))
            {
                db.UserSecurityGroups.Add(new UserSecurityGroup
                {
                    UserId = uid,
                    SecurityGroupId = existingGroup.Id,
                });
            }
        }

        await db.SaveChangesAsync();
    }
}

