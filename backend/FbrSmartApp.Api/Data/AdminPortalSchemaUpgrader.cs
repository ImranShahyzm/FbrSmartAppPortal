using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Data;

public static class AdminPortalSchemaUpgrader
{
    public static async Task ApplyAsync(AdminPortalDbContext db, CancellationToken ct = default)
    {
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.AdminUsers', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.AdminUsers(
                    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_AdminUsers PRIMARY KEY,
                    Email NVARCHAR(200) NOT NULL,
                    FullName NVARCHAR(200) NOT NULL,
                    PasswordHash NVARCHAR(500) NOT NULL,
                    Role NVARCHAR(50) NOT NULL,
                    IsActive BIT NOT NULL CONSTRAINT DF_AdminUsers_IsActive DEFAULT ((1)),
                    CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_AdminUsers_CreatedAt DEFAULT (SYSUTCDATETIME())
                );
                CREATE UNIQUE INDEX UX_AdminUsers_Email ON dbo.AdminUsers(Email);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.AdminRefreshTokens', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.AdminRefreshTokens(
                    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_AdminRefreshTokens PRIMARY KEY,
                    AdminUserId UNIQUEIDENTIFIER NOT NULL,
                    TokenHash NVARCHAR(200) NOT NULL,
                    CreatedAtUtc DATETIME2 NOT NULL,
                    ExpiresAtUtc DATETIME2 NOT NULL,
                    RevokedAtUtc DATETIME2 NULL,
                    ReplacedByTokenHash NVARCHAR(200) NULL,
                    CONSTRAINT FK_AdminRefreshTokens_AdminUsers FOREIGN KEY (AdminUserId) REFERENCES dbo.AdminUsers(Id) ON DELETE CASCADE
                );
                CREATE UNIQUE INDEX UX_AdminRefreshTokens_TokenHash ON dbo.AdminRefreshTokens(TokenHash);
                CREATE INDEX IX_AdminRefreshTokens_AdminUserId ON dbo.AdminRefreshTokens(AdminUserId);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.AdminActivities', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.AdminActivities(
                    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_AdminActivities PRIMARY KEY,
                    CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_AdminActivities_CreatedAt DEFAULT (SYSUTCDATETIME()),
                    AdminUserId UNIQUEIDENTIFIER NOT NULL,
                    AdminEmail NVARCHAR(200) NOT NULL,
                    CompanyId INT NULL,
                    Action NVARCHAR(120) NOT NULL,
                    Notes NVARCHAR(2000) NULL
                );
                CREATE INDEX IX_AdminActivities_CreatedAtUtc ON dbo.AdminActivities(CreatedAtUtc);
                CREATE INDEX IX_AdminActivities_CompanyId ON dbo.AdminActivities(CompanyId);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.AdminCompanyChatterMessages', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.AdminCompanyChatterMessages(
                    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_AdminCompanyChatterMessages PRIMARY KEY,
                    CompanyId INT NOT NULL,
                    CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_AdminCompanyChatter_CreatedAt DEFAULT (SYSUTCDATETIME()),
                    AdminUserId UNIQUEIDENTIFIER NOT NULL,
                    AuthorEmail NVARCHAR(200) NOT NULL,
                    AuthorDisplayName NVARCHAR(200) NULL,
                    Body NVARCHAR(MAX) NOT NULL,
                    AttachmentsJson NVARCHAR(MAX) NULL
                );
                CREATE INDEX IX_AdminCompanyChatter_CompanyId ON dbo.AdminCompanyChatterMessages(CompanyId);
                CREATE INDEX IX_AdminCompanyChatter_CreatedAtUtc ON dbo.AdminCompanyChatterMessages(CreatedAtUtc);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.AdminAuditLogs', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.AdminAuditLogs(
                    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_AdminAuditLogs PRIMARY KEY,
                    CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_AdminAuditLogs_CreatedAt DEFAULT (SYSUTCDATETIME()),
                    AdminUserId UNIQUEIDENTIFIER NOT NULL,
                    AdminEmail NVARCHAR(200) NOT NULL,
                    Resource NVARCHAR(80) NOT NULL,
                    Action NVARCHAR(120) NOT NULL,
                    CompanyId INT NULL,
                    PayloadJson NVARCHAR(MAX) NULL
                );
                CREATE INDEX IX_AdminAuditLogs_CreatedAtUtc ON dbo.AdminAuditLogs(CreatedAtUtc);
                CREATE INDEX IX_AdminAuditLogs_CompanyId ON dbo.AdminAuditLogs(CompanyId);
                CREATE INDEX IX_AdminAuditLogs_Resource ON dbo.AdminAuditLogs(Resource);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.CompanyOnboardings', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.CompanyOnboardings(
                    CompanyId INT NOT NULL CONSTRAINT PK_CompanyOnboardings PRIMARY KEY,
                    RegisteredAtUtc DATETIME2 NOT NULL CONSTRAINT DF_CompanyOnboardings_RegisteredAt DEFAULT (SYSUTCDATETIME()),
                    PaymentStatus NVARCHAR(24) NOT NULL CONSTRAINT DF_CompanyOnboardings_PaymentStatus DEFAULT (N'pending'),
                    PaymentModel NVARCHAR(24) NOT NULL CONSTRAINT DF_CompanyOnboardings_PaymentModel DEFAULT (N'monthly'),
                    PaymentNotes NVARCHAR(4000) NULL,
                    Amount DECIMAL(18,2) NULL,
                    Currency NVARCHAR(16) NULL,
                    ActivatedAtUtc DATETIME2 NULL,
                    DeactivatedAtUtc DATETIME2 NULL,
                    LastUpdatedAtUtc DATETIME2 NULL,
                    LastUpdatedByEmail NVARCHAR(200) NULL
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.CompanyOnboardings', 'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH('dbo.CompanyOnboardings', 'LastUpdatedAtUtc') IS NULL
                    ALTER TABLE dbo.CompanyOnboardings ADD LastUpdatedAtUtc DATETIME2 NULL;
                IF COL_LENGTH('dbo.CompanyOnboardings', 'LastUpdatedByEmail') IS NULL
                    ALTER TABLE dbo.CompanyOnboardings ADD LastUpdatedByEmail NVARCHAR(200) NULL;
            END
            """,
            ct
        );

        // If dbo.CompanyOnboardings was created by EF EnsureCreated(), CompanyId may be an IDENTITY.
        // We must be able to insert explicit CompanyId values matching GLCompany.CompanyId.
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.CompanyOnboardings', 'U') IS NOT NULL
               AND COLUMNPROPERTY(OBJECT_ID('dbo.CompanyOnboardings'), 'CompanyId', 'IsIdentity') = 1
            BEGIN
                IF OBJECT_ID('dbo.CompanyOnboardings_fix', 'U') IS NOT NULL
                    DROP TABLE dbo.CompanyOnboardings_fix;

                -- Recreate table without IDENTITY (cannot ALTER identity property).
                CREATE TABLE dbo.CompanyOnboardings_fix(
                    CompanyId INT NOT NULL CONSTRAINT PK_CompanyOnboardings_fix PRIMARY KEY,
                    RegisteredAtUtc DATETIME2 NOT NULL,
                    PaymentStatus NVARCHAR(24) NOT NULL,
                    PaymentModel NVARCHAR(24) NOT NULL,
                    PaymentNotes NVARCHAR(4000) NULL,
                    Amount DECIMAL(18,2) NULL,
                    Currency NVARCHAR(16) NULL,
                    ActivatedAtUtc DATETIME2 NULL,
                    DeactivatedAtUtc DATETIME2 NULL
                );

                -- copy from old into fix with explicit ids
                INSERT INTO dbo.CompanyOnboardings_fix(CompanyId, RegisteredAtUtc, PaymentStatus, PaymentModel, PaymentNotes, Amount, Currency, ActivatedAtUtc, DeactivatedAtUtc)
                SELECT CompanyId, RegisteredAtUtc, PaymentStatus, PaymentModel, PaymentNotes, Amount, Currency, ActivatedAtUtc, DeactivatedAtUtc
                FROM dbo.CompanyOnboardings;

                DROP TABLE dbo.CompanyOnboardings;
                EXEC sp_rename 'dbo.CompanyOnboardings_fix', 'CompanyOnboardings';
            END
            """,
            ct
        );
    }
}

