using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Data;

public static class SchemaUpgrader
{
    /// <summary>
    /// Idempotent schema fixes for dev databases created via EnsureCreated().
    /// This lets us evolve schema without EF migrations for now.
    /// </summary>
    public static async Task ApplyAsync(AppDbContext db, CancellationToken ct = default)
    {
        // Add CompanyId to Users if missing
        await db.Database.ExecuteSqlRawAsync(
            """
            IF COL_LENGTH('dbo.Users', 'CompanyId') IS NULL
            BEGIN
                ALTER TABLE dbo.Users ADD CompanyId INT NOT NULL CONSTRAINT DF_Users_CompanyId DEFAULT (1);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH('dbo.Users', 'Email') IS NULL
                    ALTER TABLE dbo.Users ADD Email NVARCHAR(200) NULL;
                IF COL_LENGTH('dbo.Users', 'PreferredLanguage') IS NULL
                    ALTER TABLE dbo.Users ADD PreferredLanguage NVARCHAR(32) NOT NULL
                        CONSTRAINT DF_Users_PreferredLanguage DEFAULT (N'en-US');
                IF COL_LENGTH('dbo.Users', 'TimeZoneId') IS NULL
                    ALTER TABLE dbo.Users ADD TimeZoneId NVARCHAR(120) NOT NULL
                        CONSTRAINT DF_Users_TimeZoneId DEFAULT (N'Asia/Karachi');
                IF COL_LENGTH('dbo.Users', 'OnboardingEnabled') IS NULL
                    ALTER TABLE dbo.Users ADD OnboardingEnabled BIT NOT NULL
                        CONSTRAINT DF_Users_OnboardingEnabled DEFAULT ((0));
                IF COL_LENGTH('dbo.Users', 'EmailSignature') IS NULL
                    ALTER TABLE dbo.Users ADD EmailSignature NVARCHAR(4000) NULL;
                IF COL_LENGTH('dbo.Users', 'CalendarDefaultPrivacy') IS NULL
                    ALTER TABLE dbo.Users ADD CalendarDefaultPrivacy NVARCHAR(32) NOT NULL
                        CONSTRAINT DF_Users_CalendarPrivacy DEFAULT (N'public');
                IF COL_LENGTH('dbo.Users', 'NotificationChannel') IS NULL
                    ALTER TABLE dbo.Users ADD NotificationChannel NVARCHAR(16) NOT NULL
                        CONSTRAINT DF_Users_NotificationChannel DEFAULT (N'email');
                IF COL_LENGTH('dbo.Users', 'AllowedCompanyIdsJson') IS NULL
                    ALTER TABLE dbo.Users ADD AllowedCompanyIdsJson NVARCHAR(500) NOT NULL
                        CONSTRAINT DF_Users_AllowedCompanyIdsJson DEFAULT (N'[]');
                IF COL_LENGTH('dbo.Users', 'DefaultCompanyId') IS NULL
                    ALTER TABLE dbo.Users ADD DefaultCompanyId INT NULL;
                IF COL_LENGTH('dbo.Users', 'ProfileImage') IS NULL
                    ALTER TABLE dbo.Users ADD ProfileImage NVARCHAR(400) NULL;
            END
            """,
            ct
        );

        // Add CompanyId to ProductProfiles if missing
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.ProductProfiles', 'U') IS NOT NULL AND COL_LENGTH('dbo.ProductProfiles', 'CompanyId') IS NULL
            BEGIN
                ALTER TABLE dbo.ProductProfiles ADD CompanyId INT NOT NULL CONSTRAINT DF_ProductProfiles_CompanyId DEFAULT (1);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.ProductProfiles', 'U') IS NOT NULL AND COL_LENGTH('dbo.ProductProfiles', 'ProductImage') IS NULL
            BEGIN
                ALTER TABLE dbo.ProductProfiles ADD ProductImage NVARCHAR(400) NULL;
            END
            """,
            ct
        );

        // Extend GLCompany with FBR fields if missing
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GLCompany', 'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH('dbo.GLCompany', 'FbrTokenSandBox') IS NULL
                    ALTER TABLE dbo.GLCompany ADD FbrTokenSandBox NVARCHAR(MAX) NULL;

                IF COL_LENGTH('dbo.GLCompany', 'FbrTokenProduction') IS NULL
                    ALTER TABLE dbo.GLCompany ADD FbrTokenProduction NVARCHAR(MAX) NULL;

                IF COL_LENGTH('dbo.GLCompany', 'EnableSandBox') IS NULL
                    ALTER TABLE dbo.GLCompany ADD EnableSandBox BIT NOT NULL CONSTRAINT DF_GLCompany_EnableSandBox DEFAULT ((1));

                IF COL_LENGTH('dbo.GLCompany', 'FbrProvinceId') IS NULL
                    ALTER TABLE dbo.GLCompany ADD FbrProvinceId INT NULL;

                IF COL_LENGTH('dbo.GLCompany', 'IsActivated') IS NULL
                    ALTER TABLE dbo.GLCompany ADD IsActivated BIT NOT NULL CONSTRAINT DF_GLCompany_IsActivated DEFAULT ((1));

                IF COL_LENGTH('dbo.GLCompany', 'EmployeeCount') IS NULL
                    ALTER TABLE dbo.GLCompany ADD EmployeeCount INT NULL;
            END
            """,
            ct
        );

        // Ensure province table exists (if user didn't create it yet)
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.Fbr_ProvinceData', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.Fbr_ProvinceData(
                    ProvinceID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Fbr_ProvinceData PRIMARY KEY,
                    Provincename NVARCHAR(350) NULL,
                    CompanyID INT NULL
                );
            END
            """,
            ct
        );

        // Ensure parties table exists (minimal fields only)
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.gen_PartiesInfo', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.gen_PartiesInfo(
                    PartyID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_gen_PartiesInfo PRIMARY KEY,
                    PartyName NVARCHAR(100) NULL,
                    AddressOne VARCHAR(300) NULL,
                    PhoneOne VARCHAR(50) NULL,
                    ContactPerson VARCHAR(100) NULL,
                    ContactPersonMobile NVARCHAR(150) NULL,
                    Email NVARCHAR(200) NULL,
                    SaleTaxRegNo VARCHAR(30) NULL,
                    NTNNO VARCHAR(30) NULL,
                    PartyBusinessName NVARCHAR(350) NULL,
                    ProvinceID INT NULL,
                    CompanyID INT NULL,
                    PartyBusinessLogo NVARCHAR(400) NULL
                );
            END
            ELSE
            BEGIN
                IF COL_LENGTH('dbo.gen_PartiesInfo', 'PartyBusinessLogo') IS NULL
                    ALTER TABLE dbo.gen_PartiesInfo ADD PartyBusinessLogo NVARCHAR(400) NULL;
                IF COL_LENGTH('dbo.gen_PartiesInfo', 'FbrStatusActive') IS NULL
                    ALTER TABLE dbo.gen_PartiesInfo ADD FbrStatusActive BIT NOT NULL
                        CONSTRAINT DF_gen_PartiesInfo_FbrStatusActive DEFAULT ((1));
            END
            """,
            ct
        );

        // FBR invoices (master / detail / chatter)
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrInvoiceNumberSequences', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.FbrInvoiceNumberSequences(
                    CompanyId INT NOT NULL CONSTRAINT PK_FbrInvoiceNumberSequences PRIMARY KEY,
                    NextValue INT NOT NULL
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrInvoices', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.FbrInvoices(
                    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_FbrInvoices PRIMARY KEY,
                    CompanyId INT NOT NULL,
                    Reference NVARCHAR(50) NOT NULL,
                    CustomerPartyId INT NOT NULL,
                    InvoiceDateUtc DATETIME2 NOT NULL,
                    PaymentTerms NVARCHAR(50) NOT NULL CONSTRAINT DF_FbrInvoices_PaymentTerms DEFAULT (N'immediate'),
                    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_FbrInvoices_Status DEFAULT (N'ordered'),
                    Returned BIT NOT NULL CONSTRAINT DF_FbrInvoices_Returned DEFAULT ((0)),
                    DeliveryFees DECIMAL(18,4) NOT NULL CONSTRAINT DF_FbrInvoices_DeliveryFees DEFAULT ((0)),
                    TotalExTaxes DECIMAL(18,4) NOT NULL CONSTRAINT DF_FbrInvoices_TotalExTaxes DEFAULT ((0)),
                    Taxes DECIMAL(18,4) NOT NULL CONSTRAINT DF_FbrInvoices_Taxes DEFAULT ((0)),
                    Total DECIMAL(18,4) NOT NULL CONSTRAINT DF_FbrInvoices_Total DEFAULT ((0)),
                    TaxRate DECIMAL(18,6) NOT NULL CONSTRAINT DF_FbrInvoices_TaxRate DEFAULT ((0)),
                    CreatedByDisplayName NVARCHAR(200) NULL,
                    UpdatedByDisplayName NVARCHAR(200) NULL,
                    CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_FbrInvoices_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
                    UpdatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_FbrInvoices_UpdatedAtUtc DEFAULT (SYSUTCDATETIME())
                );
                CREATE UNIQUE INDEX UX_FbrInvoices_Company_Reference ON dbo.FbrInvoices(CompanyId, Reference);
            END
            ELSE
            BEGIN
                IF COL_LENGTH('dbo.FbrInvoices', 'CreatedByDisplayName') IS NULL
                    ALTER TABLE dbo.FbrInvoices ADD CreatedByDisplayName NVARCHAR(200) NULL;
                IF COL_LENGTH('dbo.FbrInvoices', 'UpdatedByDisplayName') IS NULL
                    ALTER TABLE dbo.FbrInvoices ADD UpdatedByDisplayName NVARCHAR(200) NULL;

                IF COL_LENGTH('dbo.FbrInvoices', 'FbrInvoiceNumber') IS NULL
                    ALTER TABLE dbo.FbrInvoices ADD FbrInvoiceNumber NVARCHAR(100) NULL;

                IF COL_LENGTH('dbo.FbrInvoices', 'ValidatedAtUtc') IS NULL
                    ALTER TABLE dbo.FbrInvoices ADD ValidatedAtUtc DATETIME2 NULL;

                IF COL_LENGTH('dbo.FbrInvoices', 'PostedAtUtc') IS NULL
                    ALTER TABLE dbo.FbrInvoices ADD PostedAtUtc DATETIME2 NULL;

                IF COL_LENGTH('dbo.FbrInvoices', 'IsLocked') IS NULL
                    ALTER TABLE dbo.FbrInvoices ADD IsLocked BIT NOT NULL CONSTRAINT DF_FbrInvoices_IsLocked DEFAULT ((0));

                IF COL_LENGTH('dbo.FbrInvoices', 'FbrLastResponseJson') IS NULL
                    ALTER TABLE dbo.FbrInvoices ADD FbrLastResponseJson NVARCHAR(MAX) NULL;

                IF COL_LENGTH('dbo.FbrInvoices', 'FbrLastError') IS NULL
                    ALTER TABLE dbo.FbrInvoices ADD FbrLastError NVARCHAR(2000) NULL;
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrInvoiceLines', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.FbrInvoiceLines(
                    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_FbrInvoiceLines PRIMARY KEY,
                    InvoiceId UNIQUEIDENTIFIER NOT NULL,
                    SortOrder INT NOT NULL CONSTRAINT DF_FbrInvoiceLines_SortOrder DEFAULT ((0)),
                    ProductProfileId UNIQUEIDENTIFIER NOT NULL,
                    Quantity DECIMAL(18,4) NOT NULL,
                    UnitPrice DECIMAL(18,4) NOT NULL,
                    TaxRate DECIMAL(18,6) NOT NULL,
                    DiscountRate DECIMAL(18,6) NOT NULL CONSTRAINT DF_FbrInvoiceLines_DiscountRate DEFAULT ((0)),
                    HsCode NVARCHAR(50) NOT NULL CONSTRAINT DF_FbrInvoiceLines_HsCode DEFAULT (N''),
                    SroItemText NVARCHAR(500) NOT NULL CONSTRAINT DF_FbrInvoiceLines_SroItemText DEFAULT (N''),
                    Remarks NVARCHAR(500) NOT NULL CONSTRAINT DF_FbrInvoiceLines_Remarks DEFAULT (N''),
                    CONSTRAINT FK_FbrInvoiceLines_FbrInvoices FOREIGN KEY (InvoiceId)
                        REFERENCES dbo.FbrInvoices(Id) ON DELETE CASCADE
                );
                CREATE INDEX IX_FbrInvoiceLines_InvoiceId ON dbo.FbrInvoiceLines(InvoiceId);
            END
            ELSE
            BEGIN
                IF COL_LENGTH('dbo.FbrInvoiceLines', 'DiscountRate') IS NULL
                BEGIN
                    ALTER TABLE dbo.FbrInvoiceLines ADD DiscountRate DECIMAL(18,6) NOT NULL
                        CONSTRAINT DF_FbrInvoiceLines_DiscountRate DEFAULT ((0));
                END
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrInvoiceChatterMessages', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.FbrInvoiceChatterMessages(
                    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_FbrInvoiceChatterMessages PRIMARY KEY,
                    InvoiceId UNIQUEIDENTIFIER NOT NULL,
                    Body NVARCHAR(MAX) NOT NULL,
                    CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_FbrInvoiceChatter_Created DEFAULT (SYSUTCDATETIME()),
                    AuthorDisplayName NVARCHAR(200) NULL,
                    AttachmentsJson NVARCHAR(MAX) NULL,
                    CONSTRAINT FK_FbrInvoiceChatter_FbrInvoices FOREIGN KEY (InvoiceId)
                        REFERENCES dbo.FbrInvoices(Id) ON DELETE CASCADE
                );
                CREATE INDEX IX_FbrInvoiceChatter_InvoiceId ON dbo.FbrInvoiceChatterMessages(InvoiceId);
            END
            """,
            ct
        );

        // Company chatter (notes/attachments on company record)
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.CompanyChatterMessages', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.CompanyChatterMessages(
                    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_CompanyChatterMessages PRIMARY KEY,
                    CompanyId INT NOT NULL,
                    Body NVARCHAR(MAX) NOT NULL,
                    CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_CompanyChatter_Created DEFAULT (SYSUTCDATETIME()),
                    AuthorDisplayName NVARCHAR(200) NULL,
                    AttachmentsJson NVARCHAR(MAX) NULL
                );
                CREATE INDEX IX_CompanyChatter_CompanyId ON dbo.CompanyChatterMessages(CompanyId);
            END
            """,
            ct
        );

        // FBR PDI reference data (per company) + rate cache
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrPdiProvinces', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.FbrPdiProvinces(
                    CompanyId INT NOT NULL,
                    StateProvinceCode INT NOT NULL,
                    Description NVARCHAR(350) NOT NULL CONSTRAINT DF_FbrPdiProvinces_Desc DEFAULT (N''),
                    SyncedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_FbrPdiProvinces_Synced DEFAULT (SYSUTCDATETIME()),
                    CONSTRAINT PK_FbrPdiProvinces PRIMARY KEY (CompanyId, StateProvinceCode)
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrPdiDocTypes', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.FbrPdiDocTypes(
                    CompanyId INT NOT NULL,
                    DocTypeId INT NOT NULL,
                    Description NVARCHAR(400) NOT NULL CONSTRAINT DF_FbrPdiDocTypes_Desc DEFAULT (N''),
                    SyncedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_FbrPdiDocTypes_Synced DEFAULT (SYSUTCDATETIME()),
                    CONSTRAINT PK_FbrPdiDocTypes PRIMARY KEY (CompanyId, DocTypeId)
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrPdiItemDescCodes', 'U') IS NOT NULL
                AND COL_LENGTH('dbo.FbrPdiItemDescCodes', 'HsCode') IS NULL
            BEGIN
                DROP TABLE dbo.FbrPdiItemDescCodes;
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrPdiItemDescCodes', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.FbrPdiItemDescCodes(
                    CompanyId INT NOT NULL,
                    HsCode NVARCHAR(32) NOT NULL,
                    Description NVARCHAR(MAX) NOT NULL CONSTRAINT DF_FbrPdiItemDesc_Desc DEFAULT (N''),
                    SyncedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_FbrPdiItemDesc_Synced DEFAULT (SYSUTCDATETIME()),
                    CONSTRAINT PK_FbrPdiItemDescCodes PRIMARY KEY (CompanyId, HsCode)
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrPdiTransTypes', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.FbrPdiTransTypes(
                    CompanyId INT NOT NULL,
                    TransTypeId INT NOT NULL,
                    Description NVARCHAR(500) NOT NULL CONSTRAINT DF_FbrPdiTransTypes_Desc DEFAULT (N''),
                    SyncedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_FbrPdiTransTypes_Synced DEFAULT (SYSUTCDATETIME()),
                    CONSTRAINT PK_FbrPdiTransTypes PRIMARY KEY (CompanyId, TransTypeId)
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrPdiUoms', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.FbrPdiUoms(
                    CompanyId INT NOT NULL,
                    UomId INT NOT NULL,
                    Description NVARCHAR(200) NOT NULL CONSTRAINT DF_FbrPdiUoms_Desc DEFAULT (N''),
                    SyncedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_FbrPdiUoms_Synced DEFAULT (SYSUTCDATETIME()),
                    CONSTRAINT PK_FbrPdiUoms PRIMARY KEY (CompanyId, UomId)
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrPdiSaleTypeRates', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.FbrPdiSaleTypeRates(
                    CompanyId INT NOT NULL,
                    TransTypeId INT NOT NULL,
                    RateDate DATE NOT NULL,
                    OriginationSupplier INT NOT NULL,
                    RateId INT NOT NULL,
                    RateDesc NVARCHAR(300) NOT NULL CONSTRAINT DF_FbrPdiRates_Desc DEFAULT (N''),
                    RateValue DECIMAL(18,4) NOT NULL CONSTRAINT DF_FbrPdiRates_Val DEFAULT ((0)),
                    SyncedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_FbrPdiRates_Synced DEFAULT (SYSUTCDATETIME()),
                    CONSTRAINT PK_FbrPdiSaleTypeRates PRIMARY KEY (CompanyId, TransTypeId, RateDate, OriginationSupplier, RateId)
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrPdiSyncState', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.FbrPdiSyncState(
                    CompanyId INT NOT NULL CONSTRAINT PK_FbrPdiSyncState PRIMARY KEY,
                    LastSuccessAtUtc DATETIME2 NULL,
                    LastError NVARCHAR(2000) NULL
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.ProductProfiles', 'U') IS NOT NULL AND COL_LENGTH('dbo.ProductProfiles', 'FbrUomId') IS NULL
            BEGIN
                ALTER TABLE dbo.ProductProfiles ADD FbrUomId INT NULL;
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrInvoices', 'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH('dbo.FbrInvoices', 'FbrPdiTransTypeId') IS NULL
                    ALTER TABLE dbo.FbrInvoices ADD FbrPdiTransTypeId INT NULL;
                IF COL_LENGTH('dbo.FbrInvoices', 'FbrPdiRateId') IS NULL
                    ALTER TABLE dbo.FbrInvoices ADD FbrPdiRateId INT NULL;
            END
            """,
            ct
        );

        // FBR scenarios + sales tax rates (invoice header / line masters)
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrScenarios', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.FbrScenarios(
                    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_FbrScenarios PRIMARY KEY,
                    CompanyId INT NOT NULL,
                    ScenarioCode NVARCHAR(20) NOT NULL,
                    Description NVARCHAR(500) NOT NULL CONSTRAINT DF_FbrScenarios_Desc DEFAULT (N''),
                    FbrPdiTransTypeId INT NULL,
                    CONSTRAINT UQ_FbrScenarios_Company_Code UNIQUE (CompanyId, ScenarioCode)
                );
                CREATE INDEX IX_FbrScenarios_CompanyId ON dbo.FbrScenarios(CompanyId);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrSalesTaxRates', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.FbrSalesTaxRates(
                    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_FbrSalesTaxRates PRIMARY KEY,
                    CompanyId INT NOT NULL,
                    Label NVARCHAR(32) NOT NULL,
                    Percentage DECIMAL(18,6) NOT NULL,
                    EffectiveFrom DATE NOT NULL,
                    EffectiveTo DATE NULL,
                    CONSTRAINT UQ_FbrSalesTaxRates_Company_Label_From UNIQUE (CompanyId, Label, EffectiveFrom)
                );
                CREATE INDEX IX_FbrSalesTaxRates_CompanyId ON dbo.FbrSalesTaxRates(CompanyId);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrSalesTaxRateChatterMessages', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.FbrSalesTaxRateChatterMessages(
                    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_FbrSalesTaxRateChatterMessages PRIMARY KEY,
                    SalesTaxRateId INT NOT NULL,
                    Body NVARCHAR(MAX) NOT NULL,
                    CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_FbrSalesTaxRateChatter_Created DEFAULT (SYSUTCDATETIME()),
                    AuthorDisplayName NVARCHAR(200) NULL,
                    AttachmentsJson NVARCHAR(MAX) NULL,
                    CONSTRAINT FK_FbrSalesTaxRateChatter_SalesTaxRates FOREIGN KEY (SalesTaxRateId)
                        REFERENCES dbo.FbrSalesTaxRates(Id) ON DELETE CASCADE
                );
                CREATE INDEX IX_FbrSalesTaxRateChatter_SalesTaxRateId ON dbo.FbrSalesTaxRateChatterMessages(SalesTaxRateId);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrSalesTaxRates', 'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH('dbo.FbrSalesTaxRates', 'TaxComputation') IS NULL
                    ALTER TABLE dbo.FbrSalesTaxRates ADD TaxComputation NVARCHAR(40) NOT NULL
                        CONSTRAINT DF_FbrSalesTaxRates_TaxComputation DEFAULT (N'percentage');
                IF COL_LENGTH('dbo.FbrSalesTaxRates', 'IsActive') IS NULL
                    ALTER TABLE dbo.FbrSalesTaxRates ADD IsActive BIT NOT NULL
                        CONSTRAINT DF_FbrSalesTaxRates_IsActive DEFAULT ((1));
                IF COL_LENGTH('dbo.FbrSalesTaxRates', 'TaxType') IS NULL
                    ALTER TABLE dbo.FbrSalesTaxRates ADD TaxType NVARCHAR(20) NOT NULL
                        CONSTRAINT DF_FbrSalesTaxRates_TaxType DEFAULT (N'sales');
                IF COL_LENGTH('dbo.FbrSalesTaxRates', 'TaxScope') IS NULL
                    ALTER TABLE dbo.FbrSalesTaxRates ADD TaxScope NVARCHAR(20) NULL;
                IF COL_LENGTH('dbo.FbrSalesTaxRates', 'LabelOnInvoices') IS NULL
                    ALTER TABLE dbo.FbrSalesTaxRates ADD LabelOnInvoices NVARCHAR(200) NULL;
                IF COL_LENGTH('dbo.FbrSalesTaxRates', 'Description') IS NULL
                    ALTER TABLE dbo.FbrSalesTaxRates ADD Description NVARCHAR(500) NULL;
                IF COL_LENGTH('dbo.FbrSalesTaxRates', 'TaxGroup') IS NULL
                    ALTER TABLE dbo.FbrSalesTaxRates ADD TaxGroup NVARCHAR(200) NULL;
                IF COL_LENGTH('dbo.FbrSalesTaxRates', 'IncludeInAnalyticCost') IS NULL
                    ALTER TABLE dbo.FbrSalesTaxRates ADD IncludeInAnalyticCost BIT NOT NULL
                        CONSTRAINT DF_FbrSalesTaxRates_IncludeInAnalyticCost DEFAULT ((0));
                IF COL_LENGTH('dbo.FbrSalesTaxRates', 'Country') IS NULL
                    ALTER TABLE dbo.FbrSalesTaxRates ADD Country NVARCHAR(120) NULL;
                IF COL_LENGTH('dbo.FbrSalesTaxRates', 'LegalNotes') IS NULL
                    ALTER TABLE dbo.FbrSalesTaxRates ADD LegalNotes NVARCHAR(2000) NULL;
                IF COL_LENGTH('dbo.FbrSalesTaxRates', 'IncludedInPrice') IS NULL
                    ALTER TABLE dbo.FbrSalesTaxRates ADD IncludedInPrice NVARCHAR(50) NULL;
                IF COL_LENGTH('dbo.FbrSalesTaxRates', 'AffectBaseOfSubsequentTaxes') IS NULL
                    ALTER TABLE dbo.FbrSalesTaxRates ADD AffectBaseOfSubsequentTaxes BIT NOT NULL
                        CONSTRAINT DF_FbrSalesTaxRates_AffectBase DEFAULT ((0));
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.ProductProfiles', 'U') IS NOT NULL AND COL_LENGTH('dbo.ProductProfiles', 'FbrPdiTransTypeId') IS NULL
                ALTER TABLE dbo.ProductProfiles ADD FbrPdiTransTypeId INT NULL;
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.ProductProfiles', 'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH('dbo.ProductProfiles', 'FbrProductType') IS NULL
                    ALTER TABLE dbo.ProductProfiles ADD FbrProductType NVARCHAR(64) NULL;
                IF COL_LENGTH('dbo.ProductProfiles', 'PurchasePrice') IS NULL
                    ALTER TABLE dbo.ProductProfiles ADD PurchasePrice DECIMAL(18,4) NULL;
                IF COL_LENGTH('dbo.ProductProfiles', 'SroScheduleNoText') IS NULL
                    ALTER TABLE dbo.ProductProfiles ADD SroScheduleNoText NVARCHAR(500) NULL;
                IF COL_LENGTH('dbo.ProductProfiles', 'SroItemRefText') IS NULL
                    ALTER TABLE dbo.ProductProfiles ADD SroItemRefText NVARCHAR(500) NULL;
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.ProductProfileChatterMessages', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.ProductProfileChatterMessages(
                    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ProductProfileChatterMessages PRIMARY KEY,
                    ProductProfileId UNIQUEIDENTIFIER NOT NULL,
                    Body NVARCHAR(MAX) NOT NULL,
                    CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_ProductProfileChatter_Created DEFAULT (SYSUTCDATETIME()),
                    AuthorDisplayName NVARCHAR(200) NULL,
                    AttachmentsJson NVARCHAR(MAX) NULL,
                    CONSTRAINT FK_ProductProfileChatter_ProductProfiles FOREIGN KEY (ProductProfileId)
                        REFERENCES dbo.ProductProfiles(Id) ON DELETE CASCADE
                );
                CREATE INDEX IX_ProductProfileChatter_ProductProfileId ON dbo.ProductProfileChatterMessages(ProductProfileId);
            END
            """,
            ct
        );

        // Column DDL and index DDL must be separate batches: SQL Server does not resolve a column
        // added in the same batch when compiling CREATE INDEX (error 207 Invalid column name).
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrInvoices', 'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH('dbo.FbrInvoices', 'FbrScenarioId') IS NULL
                    ALTER TABLE dbo.FbrInvoices ADD FbrScenarioId INT NULL;
                IF COL_LENGTH('dbo.FbrInvoices', 'ExcelUniqueInvoiceId') IS NULL
                    ALTER TABLE dbo.FbrInvoices ADD ExcelUniqueInvoiceId INT NULL;
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrInvoices', 'U') IS NOT NULL
                AND COL_LENGTH('dbo.FbrInvoices', 'ExcelUniqueInvoiceId') IS NOT NULL
                AND NOT EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = N'UX_FbrInvoices_Company_ExcelUniqueInvoiceId'
                      AND object_id = OBJECT_ID(N'dbo.FbrInvoices'))
                CREATE UNIQUE NONCLUSTERED INDEX UX_FbrInvoices_Company_ExcelUniqueInvoiceId
                ON dbo.FbrInvoices(CompanyId, ExcelUniqueInvoiceId)
                WHERE ExcelUniqueInvoiceId IS NOT NULL;
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrInvoiceLines', 'U') IS NOT NULL
                AND COL_LENGTH('dbo.FbrInvoiceLines', 'FbrSalesTaxRateId') IS NULL
                ALTER TABLE dbo.FbrInvoiceLines ADD FbrSalesTaxRateId INT NULL;
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrInvoiceLines', 'U') IS NOT NULL
                AND COL_LENGTH('dbo.FbrInvoiceLines', 'FbrSalesTaxRateIdsJson') IS NULL
                ALTER TABLE dbo.FbrInvoiceLines ADD FbrSalesTaxRateIdsJson NVARCHAR(500) NULL;
            """,
            ct
        );

        // InvoiceNumber (system INV#####) and Reference (user): nullable columns, no extra unique/NOT NULL DB constraints.
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrInvoices', 'U') IS NOT NULL
                AND COL_LENGTH('dbo.FbrInvoices', 'InvoiceNumber') IS NULL
                ALTER TABLE dbo.FbrInvoices ADD InvoiceNumber NVARCHAR(32) NULL;
            """,
            ct
        );
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrInvoices', 'U') IS NOT NULL
                AND COL_LENGTH('dbo.FbrInvoices', 'InvoiceNumber') IS NOT NULL
            BEGIN
                UPDATE dbo.FbrInvoices SET InvoiceNumber = Reference WHERE InvoiceNumber IS NULL;
                UPDATE dbo.FbrInvoices
                SET InvoiceNumber = N'LEG-' + REPLACE(CAST(Id AS NVARCHAR(36)), N'-', N'')
                WHERE InvoiceNumber IS NULL OR LTRIM(RTRIM(InvoiceNumber)) = N'';
            END
            """,
            ct
        );
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrInvoices', 'U') IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = N'UX_FbrInvoices_Company_Reference'
                      AND object_id = OBJECT_ID(N'dbo.FbrInvoices'))
                DROP INDEX UX_FbrInvoices_Company_Reference ON dbo.FbrInvoices;
            """,
            ct
        );
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrInvoices', 'U') IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = N'UX_FbrInvoices_Company_Reference_NotNull'
                      AND object_id = OBJECT_ID(N'dbo.FbrInvoices'))
                DROP INDEX UX_FbrInvoices_Company_Reference_NotNull ON dbo.FbrInvoices;
            """,
            ct
        );
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrInvoices', 'U') IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = N'UX_FbrInvoices_Company_InvoiceNumber'
                      AND object_id = OBJECT_ID(N'dbo.FbrInvoices'))
                DROP INDEX UX_FbrInvoices_Company_InvoiceNumber ON dbo.FbrInvoices;
            """,
            ct
        );
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrInvoices', 'U') IS NOT NULL
                AND COL_LENGTH('dbo.FbrInvoices', 'Reference') IS NOT NULL
            BEGIN
                ALTER TABLE dbo.FbrInvoices ALTER COLUMN Reference NVARCHAR(50) NULL;
                UPDATE dbo.FbrInvoices SET Reference = NULL
                WHERE Reference IS NOT NULL AND LEN(LTRIM(RTRIM(Reference))) = 0;
            END
            """,
            ct
        );
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrInvoices', 'U') IS NOT NULL
                AND COL_LENGTH('dbo.FbrInvoices', 'InvoiceNumber') IS NOT NULL
                ALTER TABLE dbo.FbrInvoices ALTER COLUMN InvoiceNumber NVARCHAR(32) NULL;
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrInvoices', 'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH('dbo.FbrInvoices', 'FbrPdiTransTypeId') IS NOT NULL
                    ALTER TABLE dbo.FbrInvoices DROP COLUMN FbrPdiTransTypeId;
                IF COL_LENGTH('dbo.FbrInvoices', 'FbrPdiRateId') IS NOT NULL
                    ALTER TABLE dbo.FbrInvoices DROP COLUMN FbrPdiRateId;
            END
            """,
            ct
        );

        // Seed FBR sandbox / default digital-invoice scenarios for every company (idempotent)
        await db.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO dbo.FbrScenarios (CompanyId, ScenarioCode, Description, FbrPdiTransTypeId)
            SELECT c.Companyid, v.Code, v.Descr, NULL
            FROM dbo.GLCompany c
            CROSS JOIN (VALUES
                (N'SN001', N'Goods at standard rate to registered buyers. Sale type (purchase type for Cotton Ginners).'),
                (N'SN002', N'Goods at Standard Rate (default). Goods at standard rate to unregistered buyers.'),
                (N'SN003', N'Goods at Standard Rate (default). Sale of Steel (Melted and Re-Rolled).'),
                (N'SN004', N'Steel Melting and re-rolling. Sale by Ship Breakers.'),
                (N'SN005', N'Ship breaking.'),
                (N'SN006', N'Goods at Reduced Rate.'),
                (N'SN007', N'Exempt Goods.'),
                (N'SN008', N'Goods at zero-rate.'),
                (N'SN009', N'3rd Schedule Goods.'),
                (N'SN010', N'Cotton Spinners purchase from Cotton Ginners (Textile Sector).'),
                (N'SN011', N'Cotton Ginners.'),
                (N'SN012', N'Mobile Operators Sale (Telecom Sector).'),
                (N'SN013', N'Telecommunication services.'),
                (N'SN014', N'Toll Manufacturing sale by Steel sector.'),
                (N'SN015', N'Toll Manufacturing.'),
                (N'SN016', N'Sale of Petroleum products.'),
                (N'SN017', N'Petroleum Products.'),
                (N'SN018', N'Sale of Goods where FED is charged in ST mode. Goods (FED in ST Mode).'),
                (N'SN019', N'Sale of Services where FED is charged in ST mode. Services (FED in ST Mode).'),
                (N'SN020', N'Sale of Services. Services.'),
                (N'SN021', N'Sale of Electric Vehicles. Electric Vehicle.'),
                (N'SN022', N'Sale of Cement / Concrete Block. Cement / Concrete Block.'),
                (N'SN023', N'Sale of Potassium Chlorate. Potassium Chlorate.'),
                (N'SN024', N'Sale of CNG. CNG Sales.'),
                (N'SN025', N'Goods sold that are listed in SRO 297(1)/2023. Goods as per SRO 297(I)/2023.'),
                (N'SN026', N'Drugs sold at fixed ST rate under serial 81 of Eighth Schedule Table 1. Non-Adjustable Supplies.'),
                (N'SN027', N'Sale to End Consumer by retailers. Goods at Standard Rate (default).'),
                (N'SN028', N'Sale to End Consumer by retailers. 3rd Schedule Goods.')
            ) v(Code, Descr)
            WHERE NOT EXISTS (
                SELECT 1 FROM dbo.FbrScenarios s
                WHERE s.CompanyId = c.Companyid AND s.ScenarioCode = v.Code
            );
            """,
            ct
        );

        // Seed Pakistan / FBR-oriented default sales tax rates (idempotent by unique CompanyId+Label+EffectiveFrom)
        await db.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO dbo.FbrSalesTaxRates (CompanyId, Label, Percentage, EffectiveFrom, EffectiveTo)
            SELECT c.Companyid, v.Label, v.Pct, v.EffFrom, NULL
            FROM dbo.GLCompany c
            CROSS JOIN (VALUES
                (N'18%', CAST(0.18 AS DECIMAL(18,6)), CAST('2010-01-01' AS DATE)),
                (N'12%', CAST(0.12 AS DECIMAL(18,6)), CAST('2010-01-01' AS DATE)),
                (N'8%', CAST(0.08 AS DECIMAL(18,6)), CAST('2010-01-01' AS DATE)),
                (N'5%', CAST(0.05 AS DECIMAL(18,6)), CAST('2010-01-01' AS DATE)),
                (N'4.5%', CAST(0.045 AS DECIMAL(18,6)), CAST('2010-01-01' AS DATE)),
                (N'3%', CAST(0.03 AS DECIMAL(18,6)), CAST('2010-01-01' AS DATE)),
                (N'25%', CAST(0.25 AS DECIMAL(18,6)), CAST('2010-01-01' AS DATE)),
                (N'0%', CAST(0 AS DECIMAL(18,6)), CAST('2010-01-01' AS DATE)),
                (N'Exempt', CAST(0 AS DECIMAL(18,6)), CAST('2010-01-01' AS DATE))
            ) v(Label, Pct, EffFrom)
            WHERE NOT EXISTS (
                SELECT 1 FROM dbo.FbrSalesTaxRates t
                WHERE t.CompanyId = c.Companyid AND t.Label = v.Label AND t.EffectiveFrom = v.EffFrom
            );
            """,
            ct
        );
    }
}

