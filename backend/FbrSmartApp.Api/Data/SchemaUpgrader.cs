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

        // ProductProfiles renamed to InventItems (keep dev upgrader idempotent).
        // If a dev DB already exists with dbo.ProductProfiles, automatically rename it on first run.
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.InventItems', 'U') IS NULL AND OBJECT_ID('dbo.ProductProfiles', 'U') IS NOT NULL
            BEGIN
                EXEC sp_rename N'dbo.ProductProfiles', N'InventItems';
            END

            -- Ensure legacy ItemId exists (sequence-backed; SQL Server cannot add IDENTITY post-facto)
            IF OBJECT_ID('dbo.InventItems', 'U') IS NOT NULL
               AND COL_LENGTH(N'dbo.InventItems', N'ItemId') IS NULL
            BEGIN
                IF OBJECT_ID(N'dbo.InventItems_ItemId_Seq', N'SO') IS NULL
                BEGIN
                    CREATE SEQUENCE dbo.InventItems_ItemId_Seq
                        AS INT
                        START WITH 1
                        INCREMENT BY 1;
                END

                ALTER TABLE dbo.InventItems
                    ADD ItemId INT NOT NULL
                        CONSTRAINT DF_InventItems_ItemId DEFAULT (NEXT VALUE FOR dbo.InventItems_ItemId_Seq);
            END

            IF OBJECT_ID('dbo.InventItems', 'U') IS NOT NULL
               AND COL_LENGTH(N'dbo.InventItems', N'ItemId') IS NOT NULL
               AND NOT EXISTS (
                   SELECT 1 FROM sys.indexes
                   WHERE name = N'UX_InventItems_ItemId'
                     AND object_id = OBJECT_ID(N'dbo.InventItems'))
            BEGIN
                CREATE UNIQUE NONCLUSTERED INDEX UX_InventItems_ItemId ON dbo.InventItems(ItemId);
            END

            -- Legacy InventItems columns (nullable; no legacy FKs/constraints)
            IF OBJECT_ID('dbo.InventItems', 'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH(N'dbo.InventItems', N'CategoryID') IS NULL ALTER TABLE dbo.InventItems ADD CategoryID INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemNumber') IS NULL ALTER TABLE dbo.InventItems ADD ItemNumber BIGINT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItenName') IS NULL ALTER TABLE dbo.InventItems ADD ItenName NVARCHAR(300) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'UOMId') IS NULL ALTER TABLE dbo.InventItems ADD UOMId INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemBrandId') IS NULL ALTER TABLE dbo.InventItems ADD ItemBrandId INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'MaintainInventory') IS NULL ALTER TABLE dbo.InventItems ADD MaintainInventory BIT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemPacking') IS NULL ALTER TABLE dbo.InventItems ADD ItemPacking INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemSalesPrice') IS NULL ALTER TABLE dbo.InventItems ADD ItemSalesPrice DECIMAL(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemPurchasePrice') IS NULL ALTER TABLE dbo.InventItems ADD ItemPurchasePrice DECIMAL(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemStatus') IS NULL ALTER TABLE dbo.InventItems ADD ItemStatus BIT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemPurchaseGL') IS NULL ALTER TABLE dbo.InventItems ADD ItemPurchaseGL INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemPurReturnGL') IS NULL ALTER TABLE dbo.InventItems ADD ItemPurReturnGL INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemSalesGL') IS NULL ALTER TABLE dbo.InventItems ADD ItemSalesGL INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemSaleReturnGL') IS NULL ALTER TABLE dbo.InventItems ADD ItemSaleReturnGL INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemImage') IS NULL ALTER TABLE dbo.InventItems ADD ItemImage NVARCHAR(MAX) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'CompanyID') IS NULL ALTER TABLE dbo.InventItems ADD CompanyID INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'TaxGroupID') IS NULL ALTER TABLE dbo.InventItems ADD TaxGroupID INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'WeightedRate') IS NULL ALTER TABLE dbo.InventItems ADD WeightedRate NUMERIC(14,5) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'WHID') IS NULL ALTER TABLE dbo.InventItems ADD WHID INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemType') IS NULL ALTER TABLE dbo.InventItems ADD ItemType VARCHAR(10) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ManualNumber') IS NULL ALTER TABLE dbo.InventItems ADD ManualNumber NVARCHAR(50) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'CartonSize') IS NULL ALTER TABLE dbo.InventItems ADD CartonSize NUMERIC(10,5) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ProductWeightCode') IS NULL ALTER TABLE dbo.InventItems ADD ProductWeightCode INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'MainItem') IS NULL ALTER TABLE dbo.InventItems ADD MainItem BIT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'Remarks') IS NULL ALTER TABLE dbo.InventItems ADD Remarks NVARCHAR(500) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemVarientId') IS NULL ALTER TABLE dbo.InventItems ADD ItemVarientId INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ColorID') IS NULL ALTER TABLE dbo.InventItems ADD ColorID INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'UrduName') IS NULL ALTER TABLE dbo.InventItems ADD UrduName NVARCHAR(50) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'BardanaID') IS NULL ALTER TABLE dbo.InventItems ADD BardanaID INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'Make') IS NULL ALTER TABLE dbo.InventItems ADD Make NVARCHAR(50) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemModel') IS NULL ALTER TABLE dbo.InventItems ADD ItemModel NVARCHAR(50) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'Range') IS NULL ALTER TABLE dbo.InventItems ADD Range NVARCHAR(50) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'SerialNo') IS NULL ALTER TABLE dbo.InventItems ADD SerialNo NVARCHAR(50) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'Accessories') IS NULL ALTER TABLE dbo.InventItems ADD Accessories NVARCHAR(MAX) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'Property') IS NULL ALTER TABLE dbo.InventItems ADD Property NVARCHAR(50) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'FixAsset') IS NULL ALTER TABLE dbo.InventItems ADD FixAsset BIT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'CompanyName') IS NULL ALTER TABLE dbo.InventItems ADD CompanyName INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'Discount') IS NULL ALTER TABLE dbo.InventItems ADD Discount NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItenUrduName') IS NULL ALTER TABLE dbo.InventItems ADD ItenUrduName NVARCHAR(MAX) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemUrduName') IS NULL ALTER TABLE dbo.InventItems ADD ItemUrduName NVARCHAR(MAX) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'WholeSaleRate') IS NULL ALTER TABLE dbo.InventItems ADD WholeSaleRate NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ReOrderLevel') IS NULL ALTER TABLE dbo.InventItems ADD ReOrderLevel NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemGroupID') IS NULL ALTER TABLE dbo.InventItems ADD ItemGroupID INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemMainGroupID') IS NULL ALTER TABLE dbo.InventItems ADD ItemMainGroupID INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'SubCategoryID') IS NULL ALTER TABLE dbo.InventItems ADD SubCategoryID INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'AttributeId') IS NULL ALTER TABLE dbo.InventItems ADD AttributeId INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'SeasonType') IS NULL ALTER TABLE dbo.InventItems ADD SeasonType INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'RegisterInevntoryDate') IS NULL ALTER TABLE dbo.InventItems ADD RegisterInevntoryDate DATETIME NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'isFinisH') IS NULL ALTER TABLE dbo.InventItems ADD isFinisH BIT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'IsBatchItem') IS NULL ALTER TABLE dbo.InventItems ADD IsBatchItem BIT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'CategoryCode') IS NULL ALTER TABLE dbo.InventItems ADD CategoryCode INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'SrNo') IS NULL ALTER TABLE dbo.InventItems ADD SrNo INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'DiscountOnSale') IS NULL ALTER TABLE dbo.InventItems ADD DiscountOnSale NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'UnitCalculation') IS NULL ALTER TABLE dbo.InventItems ADD UnitCalculation NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'PerPieceDiscont') IS NULL ALTER TABLE dbo.InventItems ADD PerPieceDiscont NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'LocationID') IS NULL ALTER TABLE dbo.InventItems ADD LocationID INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ThreshHoldGram') IS NULL ALTER TABLE dbo.InventItems ADD ThreshHoldGram NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemNameEncrypted') IS NULL ALTER TABLE dbo.InventItems ADD ItemNameEncrypted NVARCHAR(MAX) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemPackingDec') IS NULL ALTER TABLE dbo.InventItems ADD ItemPackingDec NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ProductDeadLevel') IS NULL ALTER TABLE dbo.InventItems ADD ProductDeadLevel NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'EntryDate') IS NULL ALTER TABLE dbo.InventItems ADD EntryDate DATETIME NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'CurrentStock') IS NULL ALTER TABLE dbo.InventItems ADD CurrentStock NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'HSCode') IS NULL ALTER TABLE dbo.InventItems ADD HSCode NCHAR(9) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'SROCode') IS NULL ALTER TABLE dbo.InventItems ADD SROCode NCHAR(8) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'FilerTaxPercentage') IS NULL ALTER TABLE dbo.InventItems ADD FilerTaxPercentage NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'NonFilerTaxPercentage') IS NULL ALTER TABLE dbo.InventItems ADD NonFilerTaxPercentage NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'Productionlevel') IS NULL ALTER TABLE dbo.InventItems ADD Productionlevel NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'PackingCharges') IS NULL ALTER TABLE dbo.InventItems ADD PackingCharges NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'MakingCost') IS NULL ALTER TABLE dbo.InventItems ADD MakingCost NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'PartyIDDs') IS NULL ALTER TABLE dbo.InventItems ADD PartyIDDs INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'IsQuatationItem') IS NULL ALTER TABLE dbo.InventItems ADD IsQuatationItem BIT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'IsServiceItem') IS NULL ALTER TABLE dbo.InventItems ADD IsServiceItem BIT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ShowCode') IS NULL ALTER TABLE dbo.InventItems ADD ShowCode BIT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'RelaxationQty') IS NULL ALTER TABLE dbo.InventItems ADD RelaxationQty NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'RelaxationOn') IS NULL ALTER TABLE dbo.InventItems ADD RelaxationOn NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'FactoryItems') IS NULL ALTER TABLE dbo.InventItems ADD FactoryItems INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'SentItems') IS NULL ALTER TABLE dbo.InventItems ADD SentItems INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'Length') IS NULL ALTER TABLE dbo.InventItems ADD Length NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'width') IS NULL ALTER TABLE dbo.InventItems ADD width NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ColorCount') IS NULL ALTER TABLE dbo.InventItems ADD ColorCount NVARCHAR(100) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'UsagePeriod') IS NULL ALTER TABLE dbo.InventItems ADD UsagePeriod NVARCHAR(100) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ProductPartyID') IS NULL ALTER TABLE dbo.InventItems ADD ProductPartyID INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'AccountVoucherID') IS NULL ALTER TABLE dbo.InventItems ADD AccountVoucherID INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'IsCylinder') IS NULL ALTER TABLE dbo.InventItems ADD IsCylinder BIT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ProductStdWeightInGrams') IS NULL ALTER TABLE dbo.InventItems ADD ProductStdWeightInGrams NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'ItemConfigureType') IS NULL ALTER TABLE dbo.InventItems ADD ItemConfigureType INT NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'RateFactor') IS NULL ALTER TABLE dbo.InventItems ADD RateFactor NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'OdoMeterReading') IS NULL ALTER TABLE dbo.InventItems ADD OdoMeterReading NUMERIC(18,3) NULL;
                IF COL_LENGTH(N'dbo.InventItems', N'PerKg') IS NULL ALTER TABLE dbo.InventItems ADD PerKg NUMERIC(18,3) NULL;
            END

            -- Backward compatibility: if the table was renamed, keep a view under the old name.
            IF OBJECT_ID('dbo.InventItems', 'U') IS NOT NULL
               AND OBJECT_ID('dbo.ProductProfiles', 'U') IS NULL
               AND OBJECT_ID('dbo.ProductProfiles', 'V') IS NULL
            BEGIN
                EXEC(N'
                    CREATE VIEW dbo.ProductProfiles AS
                    SELECT * FROM dbo.InventItems;
                ');
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.InventItems', 'U') IS NOT NULL AND COL_LENGTH('dbo.InventItems', 'CompanyId') IS NULL
                ALTER TABLE dbo.InventItems ADD CompanyId INT NOT NULL CONSTRAINT DF_InventItems_CompanyId DEFAULT (1);
            ELSE IF OBJECT_ID('dbo.ProductProfiles', 'U') IS NOT NULL AND COL_LENGTH('dbo.ProductProfiles', 'CompanyId') IS NULL
                ALTER TABLE dbo.ProductProfiles ADD CompanyId INT NOT NULL CONSTRAINT DF_ProductProfiles_CompanyId DEFAULT (1);
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.InventItems', 'U') IS NOT NULL AND COL_LENGTH('dbo.InventItems', 'ProductImage') IS NULL
                ALTER TABLE dbo.InventItems ADD ProductImage NVARCHAR(400) NULL;
            ELSE IF OBJECT_ID('dbo.ProductProfiles', 'U') IS NOT NULL AND COL_LENGTH('dbo.ProductProfiles', 'ProductImage') IS NULL
                ALTER TABLE dbo.ProductProfiles ADD ProductImage NVARCHAR(400) NULL;
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
                    InvoiceDate DATE NOT NULL,
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
                -- Important: SQL Server compiles the whole batch, so statements that reference
                -- a not-yet-existing column can fail even when guarded by IF COL_LENGTH.
                -- Use dynamic SQL to safely backfill + enforce NOT NULL after adding column.
                IF COL_LENGTH('dbo.FbrInvoices', 'InvoiceDate') IS NULL
                BEGIN
                    ALTER TABLE dbo.FbrInvoices ADD InvoiceDate DATE NULL;
                    EXEC(N'
                        UPDATE dbo.FbrInvoices
                        SET InvoiceDate = CAST(InvoiceDateUtc AS DATE)
                        WHERE InvoiceDate IS NULL;
                    ');
                    EXEC(N'ALTER TABLE dbo.FbrInvoices ALTER COLUMN InvoiceDate DATE NOT NULL;');
                END
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
                    FixedNotifiedApplicable BIT NOT NULL CONSTRAINT DF_FbrInvoiceLines_FixedNotifiedApplicable DEFAULT ((0)),
                    MrpRateValue DECIMAL(18,4) NOT NULL CONSTRAINT DF_FbrInvoiceLines_MrpRateValue DEFAULT ((0)),
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
                IF COL_LENGTH('dbo.FbrInvoiceLines', 'FixedNotifiedApplicable') IS NULL
                    ALTER TABLE dbo.FbrInvoiceLines ADD FixedNotifiedApplicable BIT NOT NULL
                        CONSTRAINT DF_FbrInvoiceLines_FixedNotifiedApplicable DEFAULT ((0));
                IF COL_LENGTH('dbo.FbrInvoiceLines', 'MrpRateValue') IS NULL
                    ALTER TABLE dbo.FbrInvoiceLines ADD MrpRateValue DECIMAL(18,4) NOT NULL
                        CONSTRAINT DF_FbrInvoiceLines_MrpRateValue DEFAULT ((0));
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
            IF OBJECT_ID('dbo.InventItems', 'U') IS NOT NULL AND COL_LENGTH('dbo.InventItems', 'FbrUomId') IS NULL
                ALTER TABLE dbo.InventItems ADD FbrUomId INT NULL;
            ELSE IF OBJECT_ID('dbo.ProductProfiles', 'U') IS NOT NULL AND COL_LENGTH('dbo.ProductProfiles', 'FbrUomId') IS NULL
                ALTER TABLE dbo.ProductProfiles ADD FbrUomId INT NULL;
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
            IF OBJECT_ID('dbo.InventItems', 'U') IS NOT NULL AND COL_LENGTH('dbo.InventItems', 'FbrPdiTransTypeId') IS NULL
                ALTER TABLE dbo.InventItems ADD FbrPdiTransTypeId INT NULL;
            ELSE IF OBJECT_ID('dbo.ProductProfiles', 'U') IS NOT NULL AND COL_LENGTH('dbo.ProductProfiles', 'FbrPdiTransTypeId') IS NULL
                ALTER TABLE dbo.ProductProfiles ADD FbrPdiTransTypeId INT NULL;
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.InventItems', 'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH('dbo.InventItems', 'FbrProductType') IS NULL
                    ALTER TABLE dbo.InventItems ADD FbrProductType NVARCHAR(64) NULL;
                IF COL_LENGTH('dbo.InventItems', 'PurchasePrice') IS NULL
                    ALTER TABLE dbo.InventItems ADD PurchasePrice DECIMAL(18,4) NULL;
                IF COL_LENGTH('dbo.InventItems', 'SroScheduleNoText') IS NULL
                    ALTER TABLE dbo.InventItems ADD SroScheduleNoText NVARCHAR(500) NULL;
                IF COL_LENGTH('dbo.InventItems', 'SroItemRefText') IS NULL
                    ALTER TABLE dbo.InventItems ADD SroItemRefText NVARCHAR(500) NULL;
                IF COL_LENGTH('dbo.InventItems', 'FixedNotifiedApplicable') IS NULL
                    ALTER TABLE dbo.InventItems ADD FixedNotifiedApplicable BIT NOT NULL
                        CONSTRAINT DF_InventItems_FixedNotifiedApplicable DEFAULT ((0));
                IF COL_LENGTH('dbo.InventItems', 'MrpRateValue') IS NULL
                    ALTER TABLE dbo.InventItems ADD MrpRateValue DECIMAL(18,4) NULL;
            END
            ELSE IF OBJECT_ID('dbo.ProductProfiles', 'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH('dbo.ProductProfiles', 'FbrProductType') IS NULL
                    ALTER TABLE dbo.ProductProfiles ADD FbrProductType NVARCHAR(64) NULL;
                IF COL_LENGTH('dbo.ProductProfiles', 'PurchasePrice') IS NULL
                    ALTER TABLE dbo.ProductProfiles ADD PurchasePrice DECIMAL(18,4) NULL;
                IF COL_LENGTH('dbo.ProductProfiles', 'SroScheduleNoText') IS NULL
                    ALTER TABLE dbo.ProductProfiles ADD SroScheduleNoText NVARCHAR(500) NULL;
                IF COL_LENGTH('dbo.ProductProfiles', 'SroItemRefText') IS NULL
                    ALTER TABLE dbo.ProductProfiles ADD SroItemRefText NVARCHAR(500) NULL;
                IF COL_LENGTH('dbo.ProductProfiles', 'FixedNotifiedApplicable') IS NULL
                    ALTER TABLE dbo.ProductProfiles ADD FixedNotifiedApplicable BIT NOT NULL
                        CONSTRAINT DF_ProductProfiles_FixedNotifiedApplicable DEFAULT ((0));
                IF COL_LENGTH('dbo.ProductProfiles', 'MrpRateValue') IS NULL
                    ALTER TABLE dbo.ProductProfiles ADD MrpRateValue DECIMAL(18,4) NULL;
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

        // Enforce uniqueness of system invoice number within a company (but allow reuse across companies).
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.FbrInvoices', 'U') IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM sys.indexes
                  WHERE name = N'UX_FbrInvoices_Company_InvoiceNumber'
                    AND object_id = OBJECT_ID(N'dbo.FbrInvoices'))
            BEGIN
                CREATE UNIQUE NONCLUSTERED INDEX UX_FbrInvoices_Company_InvoiceNumber
                ON dbo.FbrInvoices(CompanyId, InvoiceNumber)
                WHERE InvoiceNumber IS NOT NULL AND InvoiceNumber <> N'';
            END
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

        // Users: module access rights JSON (accounting, etc.)
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
                AND COL_LENGTH('dbo.Users', 'AccessRightsJson') IS NULL
                ALTER TABLE dbo.Users ADD AccessRightsJson NVARCHAR(MAX) NULL;
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
                AND COL_LENGTH('dbo.Users', 'PermissionsJson') IS NULL
                ALTER TABLE dbo.Users ADD PermissionsJson NVARCHAR(MAX) NULL;
            """,
            ct
        );

        // RBAC: security groups and assignments
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.SecurityGroups', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.SecurityGroups(
                    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SecurityGroups PRIMARY KEY,
                    CompanyId INT NOT NULL,
                    Name NVARCHAR(200) NOT NULL,
                    ApplicationScope NVARCHAR(120) NULL,
                    ShareGroup BIT NOT NULL CONSTRAINT DF_SecurityGroups_ShareGroup DEFAULT ((0)),
                    ApiKeysMaxDurationDays DECIMAL(18,2) NULL,
                    Notes NVARCHAR(MAX) NULL,
                    CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_SecurityGroups_Created DEFAULT (SYSUTCDATETIME())
                );
                CREATE INDEX IX_SecurityGroups_Company_Name ON dbo.SecurityGroups(CompanyId, Name);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.UserSecurityGroups', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.UserSecurityGroups(
                    UserId UNIQUEIDENTIFIER NOT NULL,
                    SecurityGroupId INT NOT NULL,
                    CONSTRAINT PK_UserSecurityGroups PRIMARY KEY (UserId, SecurityGroupId),
                    CONSTRAINT FK_UserSecurityGroups_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE CASCADE,
                    CONSTRAINT FK_UserSecurityGroups_SecurityGroups FOREIGN KEY (SecurityGroupId) REFERENCES dbo.SecurityGroups(Id) ON DELETE CASCADE
                );
                CREATE INDEX IX_UserSecurityGroups_Group ON dbo.UserSecurityGroups(SecurityGroupId);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GroupAccessRights', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.GroupAccessRights(
                    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GroupAccessRights PRIMARY KEY,
                    SecurityGroupId INT NOT NULL,
                    DisplayName NVARCHAR(300) NOT NULL,
                    PermissionsPrefix NVARCHAR(64) NOT NULL,
                    ModelKey NVARCHAR(120) NOT NULL,
                    CanRead BIT NOT NULL CONSTRAINT DF_GAR_Read DEFAULT ((0)),
                    CanWrite BIT NOT NULL CONSTRAINT DF_GAR_Write DEFAULT ((0)),
                    CanCreate BIT NOT NULL CONSTRAINT DF_GAR_Create DEFAULT ((0)),
                    CanDelete BIT NOT NULL CONSTRAINT DF_GAR_Delete DEFAULT ((0)),
                    CONSTRAINT FK_GroupAccessRights_SecurityGroups FOREIGN KEY (SecurityGroupId) REFERENCES dbo.SecurityGroups(Id) ON DELETE CASCADE
                );
                CREATE INDEX IX_GroupAccessRights_Group ON dbo.GroupAccessRights(SecurityGroupId);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GroupRecordRules', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.GroupRecordRules(
                    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GroupRecordRules PRIMARY KEY,
                    SecurityGroupId INT NOT NULL,
                    Name NVARCHAR(300) NOT NULL,
                    PermissionsPrefix NVARCHAR(64) NOT NULL,
                    ModelKey NVARCHAR(120) NOT NULL,
                    Domain NVARCHAR(MAX) NULL,
                    ApplyRead BIT NOT NULL CONSTRAINT DF_GRR_Read DEFAULT ((1)),
                    ApplyWrite BIT NOT NULL CONSTRAINT DF_GRR_Write DEFAULT ((0)),
                    ApplyCreate BIT NOT NULL CONSTRAINT DF_GRR_Create DEFAULT ((0)),
                    ApplyDelete BIT NOT NULL CONSTRAINT DF_GRR_Delete DEFAULT ((0)),
                    CONSTRAINT FK_GroupRecordRules_SecurityGroups FOREIGN KEY (SecurityGroupId) REFERENCES dbo.SecurityGroups(Id) ON DELETE CASCADE
                );
                CREATE INDEX IX_GroupRecordRules_Group ON dbo.GroupRecordRules(SecurityGroupId);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF COL_LENGTH('dbo.GroupRecordRules', 'FieldName') IS NULL
                ALTER TABLE dbo.GroupRecordRules ADD FieldName NVARCHAR(120) NULL;
            IF COL_LENGTH('dbo.GroupRecordRules', 'Operator') IS NULL
                ALTER TABLE dbo.GroupRecordRules ADD Operator NVARCHAR(16) NULL;
            IF COL_LENGTH('dbo.GroupRecordRules', 'RightOperandJson') IS NULL
                ALTER TABLE dbo.GroupRecordRules ADD RightOperandJson NVARCHAR(MAX) NULL;
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GroupMenuGrants', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.GroupMenuGrants(
                    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GroupMenuGrants PRIMARY KEY,
                    SecurityGroupId INT NOT NULL,
                    MenuKey NVARCHAR(200) NOT NULL,
                    Visible BIT NOT NULL CONSTRAINT DF_GMG_Visible DEFAULT ((1)),
                    CONSTRAINT FK_GroupMenuGrants_SecurityGroups FOREIGN KEY (SecurityGroupId) REFERENCES dbo.SecurityGroups(Id) ON DELETE CASCADE,
                    CONSTRAINT UX_GroupMenuGrants_Group_Key UNIQUE (SecurityGroupId, MenuKey)
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.SecurityGroupInheritances', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.SecurityGroupInheritances(
                    SecurityGroupId INT NOT NULL,
                    ParentSecurityGroupId INT NOT NULL,
                    CONSTRAINT PK_SecurityGroupInheritances PRIMARY KEY (SecurityGroupId, ParentSecurityGroupId),
                    CONSTRAINT FK_SGI_Child FOREIGN KEY (SecurityGroupId) REFERENCES dbo.SecurityGroups(Id) ON DELETE CASCADE,
                    CONSTRAINT FK_SGI_Parent FOREIGN KEY (ParentSecurityGroupId) REFERENCES dbo.SecurityGroups(Id)
                );
            END
            """,
            ct
        );

        // Branches (per company); no legacy GLUser foreign keys
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.gen_BranchInfo', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.gen_BranchInfo(
                    BranchID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_gen_BranchInfo PRIMARY KEY,
                    EntryUserID INT NULL,
                    EntryUserDateTime DATETIME NULL,
                    ModifyUserID INT NULL,
                    ModifyUserDateTime DATETIME NULL,
                    CompanyID INT NULL,
                    BranchName NVARCHAR(100) NULL,
                    BranchCode NVARCHAR(50) NULL,
                    BranchNumber NVARCHAR(50) NULL,
                    BranchEmail NVARCHAR(50) NULL,
                    BranchAddress NVARCHAR(200) NULL,
                    BranchDescription NVARCHAR(500) NULL
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.gen_BranchInfo', 'U') IS NOT NULL
              AND OBJECT_ID('dbo.GLCompany', 'U') IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_gen_BranchInfo_GLCompany'
                    AND parent_object_id = OBJECT_ID(N'dbo.gen_BranchInfo'))
            BEGIN
                ALTER TABLE dbo.gen_BranchInfo ADD CONSTRAINT FK_gen_BranchInfo_GLCompany
                    FOREIGN KEY (CompanyID) REFERENCES dbo.GLCompany(Companyid);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GLChartOFAccount', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.GLChartOFAccount(
                    GLCAID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GLChartOFAccount PRIMARY KEY,
                    GLCode NVARCHAR(500) NULL,
                    GLTitle NVARCHAR(500) NULL,
                    GLType INT NULL,
                    isParent INT NULL,
                    GLNature TINYINT NULL,
                    Fiscalid INT NULL,
                    GLBSid INT NULL,
                    GLPLid INT NULL,
                    Companyid INT NULL,
                    Status BIT NOT NULL CONSTRAINT DF_GLChartOFAccount_Status DEFAULT ((0)),
                    EntryBy VARCHAR(50) NULL,
                    UserID INT NULL,
                    AccountLevelOne VARCHAR(10) NOT NULL CONSTRAINT DF_GLChartOFAccount_AccountLevelOne DEFAULT (N''),
                    AccountLevelTwo VARCHAR(10) NULL,
                    AccountlevelThree VARCHAR(10) NULL,
                    AccountLevelFour VARCHAR(10) NULL,
                    AccountLevelFive VARCHAR(10) NULL,
                    AccountLevelSix VARCHAR(10) NULL,
                    AccountLevelSeven VARCHAR(10) NULL,
                    AccountLevelEight VARCHAR(10) NULL,
                    AccountLevelNine VARCHAR(10) NULL,
                    AccountLevelTen VARCHAR(10) NULL,
                    GLLevel TINYINT NULL,
                    ReadOnly BIT NOT NULL CONSTRAINT DF_GLChartOFAccount_ReadOnly DEFAULT ((0)),
                    OLDGLCODE NVARCHAR(250) NULL,
                    AllowReconciliation BIT NOT NULL CONSTRAINT DF_GLChartOFAccount_AllowReconciliation DEFAULT ((0))
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GLChartOFAccount', 'U') IS NOT NULL
                AND COL_LENGTH('dbo.GLChartOFAccount', 'AllowReconciliation') IS NULL
                ALTER TABLE dbo.GLChartOFAccount ADD AllowReconciliation BIT NOT NULL
                    CONSTRAINT DF_GLChartOFAccount_AllowReconciliation2 DEFAULT ((0));
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GLChartOFAccount', 'U') IS NOT NULL
                AND COL_LENGTH('dbo.GLChartOFAccount', 'AccountCurrency') IS NULL
                ALTER TABLE dbo.GLChartOFAccount ADD AccountCurrency NVARCHAR(10) NULL;
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GLChartOFAccount', 'U') IS NOT NULL
                AND COL_LENGTH('dbo.GLChartOFAccount', 'ChartAccountGroupKey') IS NULL
                ALTER TABLE dbo.GLChartOFAccount ADD ChartAccountGroupKey NVARCHAR(36) NULL;
            """,
            ct
        );

        // Account groups (hierarchical, range-based)
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GlAccountGroups', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.GlAccountGroups(
                    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GlAccountGroups PRIMARY KEY,
                    CompanyId INT NOT NULL,
                    GroupName NVARCHAR(200) NOT NULL,
                    FromCode BIGINT NOT NULL,
                    ToCode BIGINT NOT NULL,
                    ParentGroupId INT NULL,
                    ColorHex NVARCHAR(7) NOT NULL,
                    CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_GlAccountGroups_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
                    UpdatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_GlAccountGroups_UpdatedAtUtc DEFAULT (SYSUTCDATETIME()),
                    CONSTRAINT FK_GlAccountGroups_Parent FOREIGN KEY (ParentGroupId) REFERENCES dbo.GlAccountGroups(Id),
                    CONSTRAINT FK_GlAccountGroups_Company FOREIGN KEY (CompanyId) REFERENCES dbo.GLCompany(Companyid)
                );
                CREATE INDEX IX_GlAccountGroups_Company_Parent_Range ON dbo.GlAccountGroups(CompanyId, ParentGroupId, FromCode, ToCode);
                CREATE UNIQUE INDEX UX_GlAccountGroups_Company_Parent_RangeExact ON dbo.GlAccountGroups(CompanyId, ParentGroupId, FromCode, ToCode);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GLAccontType', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.GLAccontType(
                    AccountTypeID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GLAccontType PRIMARY KEY,
                    Title VARCHAR(100) NULL,
                    MainParent INT NULL,
                    ReportingHead NVARCHAR(500) NULL,
                    OrderBy TINYINT NULL
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GLChartOFAccount', 'U') IS NOT NULL
              AND OBJECT_ID('dbo.GLCompany', 'U') IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_GLChartOFAccount_GLCompany'
                    AND parent_object_id = OBJECT_ID(N'dbo.GLChartOFAccount'))
            BEGIN
                ALTER TABLE dbo.GLChartOFAccount ADD CONSTRAINT FK_GLChartOFAccount_GLCompany
                    FOREIGN KEY (Companyid) REFERENCES dbo.GLCompany(Companyid);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GLChartOfAccountBranchDetail', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.GLChartOfAccountBranchDetail(
                    GLCABranchDetailID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GLChartOfAccountBranchDetail PRIMARY KEY,
                    GLCAID INT NULL,
                    BranchID INT NULL
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GLChartOfAccountBranchDetail', 'U') IS NOT NULL
              AND OBJECT_ID('dbo.gen_BranchInfo', 'U') IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_GLChartOfAccountBranchDetail_gen_BranchInfo'
                    AND parent_object_id = OBJECT_ID(N'dbo.GLChartOfAccountBranchDetail'))
            BEGIN
                ALTER TABLE dbo.GLChartOfAccountBranchDetail ADD CONSTRAINT FK_GLChartOfAccountBranchDetail_gen_BranchInfo
                    FOREIGN KEY (BranchID) REFERENCES dbo.gen_BranchInfo(BranchID);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GLChartOfAccountBranchDetail', 'U') IS NOT NULL
              AND OBJECT_ID('dbo.GLChartOFAccount', 'U') IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_GLChartOfAccountBranchDetail_GLChartOFAccount'
                    AND parent_object_id = OBJECT_ID(N'dbo.GLChartOfAccountBranchDetail'))
            BEGIN
                ALTER TABLE dbo.GLChartOfAccountBranchDetail ADD CONSTRAINT FK_GLChartOfAccountBranchDetail_GLChartOFAccount
                    FOREIGN KEY (GLCAID) REFERENCES dbo.GLChartOFAccount(GLCAID);
            END
            """,
            ct
        );

        // Users resource moved from FBR to Settings: migrate group access rows to settings.users.* permissions.
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GroupAccessRights', 'U') IS NOT NULL
            BEGIN
                UPDATE dbo.GroupAccessRights
                SET PermissionsPrefix = N'settings',
                    DisplayName = N'Settings: Users'
                WHERE PermissionsPrefix = N'fbr' AND ModelKey = N'users';
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.RecordRuleModelFieldSettings', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.RecordRuleModelFieldSettings(
                    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RecordRuleModelFieldSettings PRIMARY KEY,
                    PermissionsPrefix NVARCHAR(64) NOT NULL,
                    ModelKey NVARCHAR(128) NOT NULL,
                    FieldName NVARCHAR(128) NOT NULL,
                    IsEnabled BIT NOT NULL CONSTRAINT DF_RecordRuleModelFieldSettings_IsEnabled DEFAULT (1),
                    CONSTRAINT UQ_RecordRuleModelFieldSettings_ModelField UNIQUE (PermissionsPrefix, ModelKey, FieldName)
                );
                CREATE INDEX IX_RecordRuleModelFieldSettings_Model ON dbo.RecordRuleModelFieldSettings(PermissionsPrefix, ModelKey);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.data_RegisterCurrency', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.data_RegisterCurrency(
                    CurrencyID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_data_RegisterCurrency PRIMARY KEY,
                    CurrencyName NVARCHAR(150) NOT NULL,
                    CurrencyShortName NVARCHAR(50) NOT NULL,
                    CurrencySymbol NVARCHAR(100) NOT NULL,
                    CurrencyNo INT NOT NULL CONSTRAINT DF_data_RegisterCurrency_CurrencyNo DEFAULT (0),
                    BaseCurrency BIT NOT NULL CONSTRAINT DF_data_RegisterCurrency_Base DEFAULT (0),
                    CurrencyStatus BIT NULL,
                    LogSourceID INT NULL
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.data_RegisterCurrency', 'U') IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM dbo.data_RegisterCurrency WHERE CurrencyShortName = N'PKR')
            BEGIN
                INSERT INTO dbo.data_RegisterCurrency (CurrencyName, CurrencyShortName, CurrencySymbol, CurrencyNo, BaseCurrency, CurrencyStatus)
                VALUES (N'Pakistani Rupee', N'PKR', N'Rs.', 1, 1, 1);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GLVoucherType', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.GLVoucherType(
                    Voucherid INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GLVoucherType PRIMARY KEY,
                    Title NVARCHAR(50) NULL,
                    Description NVARCHAR(100) NULL,
                    Companyid INT NULL,
                    Status BIT NOT NULL CONSTRAINT DF_GLVoucherType_Status DEFAULT (0),
                    EntryBy NVARCHAR(50) NULL,
                    UserID INT NULL,
                    ShowBankAndChequeDate BIT NOT NULL CONSTRAINT DF_GLVoucherType_ShowBankAndChequeDate DEFAULT (0),
                    SystemType INT NOT NULL CONSTRAINT DF_GLVoucherType_SystemType DEFAULT (0),
                    ShowToPartyV BIT NOT NULL CONSTRAINT DF_GLVoucherType_ShowToPartyV DEFAULT (0),
                    InterTransferPolicy BIT NOT NULL CONSTRAINT DF_GLVoucherType_InterTransferPolicy DEFAULT (0),
                    ShowToAccountBook BIT NOT NULL CONSTRAINT DF_GLVoucherType_ShowToAccountBook DEFAULT (0),
                    CurrencyID INT NULL,
                    CONSTRAINT FK_GLVoucherType_GLCompany FOREIGN KEY (Companyid) REFERENCES dbo.GLCompany(Companyid),
                    CONSTRAINT FK_GLVoucherType_Currency FOREIGN KEY (CurrencyID) REFERENCES dbo.data_RegisterCurrency(CurrencyID)
                );
                CREATE INDEX IX_GLVoucherType_Company ON dbo.GLVoucherType(Companyid);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF COL_LENGTH('dbo.GLVoucherType', 'DefaultControlGlAccountId') IS NULL
                ALTER TABLE dbo.GLVoucherType ADD DefaultControlGlAccountId INT NULL;
            IF COL_LENGTH('dbo.GLVoucherType', 'ControlAccountTxnNature') IS NULL
                ALTER TABLE dbo.GLVoucherType ADD ControlAccountTxnNature TINYINT NULL;
            IF COL_LENGTH('dbo.GLVoucherType', 'DefaultIncomeGlAccountId') IS NULL
                ALTER TABLE dbo.GLVoucherType ADD DefaultIncomeGlAccountId INT NULL;
            IF COL_LENGTH('dbo.GLVoucherType', 'SignatureSlotCount') IS NULL
                ALTER TABLE dbo.GLVoucherType ADD SignatureSlotCount TINYINT NULL;
            IF COL_LENGTH('dbo.GLVoucherType', 'SignatureName1') IS NULL
                ALTER TABLE dbo.GLVoucherType ADD SignatureName1 NVARCHAR(200) NULL;
            IF COL_LENGTH('dbo.GLVoucherType', 'SignatureName2') IS NULL
                ALTER TABLE dbo.GLVoucherType ADD SignatureName2 NVARCHAR(200) NULL;
            IF COL_LENGTH('dbo.GLVoucherType', 'SignatureName3') IS NULL
                ALTER TABLE dbo.GLVoucherType ADD SignatureName3 NVARCHAR(200) NULL;
            IF COL_LENGTH('dbo.GLVoucherType', 'SignatureName4') IS NULL
                ALTER TABLE dbo.GLVoucherType ADD SignatureName4 NVARCHAR(200) NULL;
            IF COL_LENGTH('dbo.GLVoucherType', 'DocumentPrefix') IS NULL
                ALTER TABLE dbo.GLVoucherType ADD DocumentPrefix NVARCHAR(32) NULL;
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.ApprovalStatuses', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.ApprovalStatuses(
                    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ApprovalStatuses PRIMARY KEY,
                    Code NVARCHAR(32) NOT NULL,
                    Name NVARCHAR(100) NOT NULL,
                    SortOrder INT NOT NULL CONSTRAINT DF_ApprovalStatuses_SortOrder DEFAULT (0),
                    CONSTRAINT UQ_ApprovalStatuses_Code UNIQUE (Code)
                );
            END
            IF NOT EXISTS (SELECT 1 FROM dbo.ApprovalStatuses)
            BEGIN
                INSERT INTO dbo.ApprovalStatuses (Code, Name, SortOrder) VALUES
                (N'draft', N'Draft', 0),
                (N'approved', N'Approved', 1),
                (N'confirmed', N'Confirmed', 2),
                (N'posted', N'Posted', 3),
                (N'deleted', N'Deleted', 4);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GLvMAIN', 'U') IS NOT NULL
              AND COL_LENGTH('dbo.GLvMAIN', 'ApprovalStatusId') IS NULL
            BEGIN
                ALTER TABLE dbo.GLvMAIN ADD ApprovalStatusId INT NULL;
                ALTER TABLE dbo.GLvMAIN ADD CONSTRAINT FK_GLvMAIN_ApprovalStatuses
                    FOREIGN KEY (ApprovalStatusId) REFERENCES dbo.ApprovalStatuses(Id);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GLvMAIN', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.GLvMAIN(
                    vID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GLvMAIN PRIMARY KEY,
                    vType INT NOT NULL,
                    vNO NVARCHAR(50) NULL,
                    vDate DATE NOT NULL CONSTRAINT DF_GLvMAIN_vDate DEFAULT (CAST(GETDATE() AS DATE)),
                    vremarks NVARCHAR(300) NULL,
                    ManualNo NVARCHAR(50) NULL,
                    FiscalID INT NULL,
                    Comp_Id INT NOT NULL,
                    BranchID INT NULL,
                    vCancel BIT NOT NULL CONSTRAINT DF_GLvMAIN_vCancel DEFAULT (0),
                    vPost BIT NOT NULL CONSTRAINT DF_GLvMAIN_vPost DEFAULT (0),
                    vPostedByUserId UNIQUEIDENTIFIER NULL,
                    vPostedByDate DATETIME2(7) NULL,
                    vEnterDate DATETIME2(7) NOT NULL CONSTRAINT DF_GLvMAIN_vEnterDate DEFAULT (SYSUTCDATETIME()),
                    TotalDr DECIMAL(18, 3) NULL,
                    TotalCr DECIMAL(18, 3) NULL,
                    ReadOnly BIT NOT NULL CONSTRAINT DF_GLvMAIN_ReadOnly DEFAULT (0),
                    ApprovalStatusId INT NULL,
                    CONSTRAINT FK_GLvMAIN_GLCompany FOREIGN KEY (Comp_Id) REFERENCES dbo.GLCompany(Companyid),
                    CONSTRAINT FK_GLvMAIN_GLVoucherType FOREIGN KEY (vType) REFERENCES dbo.GLVoucherType(Voucherid),
                    CONSTRAINT FK_GLvMAIN_ApprovalStatuses_NewDb FOREIGN KEY (ApprovalStatusId) REFERENCES dbo.ApprovalStatuses(Id)
                );
                CREATE INDEX IX_GLvMAIN_Company_Date ON dbo.GLvMAIN(Comp_Id, vDate DESC);
                CREATE INDEX IX_GLvMAIN_Company_Type ON dbo.GLvMAIN(Comp_Id, vType);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GLvMAIN', 'U') IS NOT NULL
              AND COL_LENGTH('dbo.GLvMAIN', 'ApprovalStatusId') IS NOT NULL
            BEGIN
                UPDATE m
                SET m.ApprovalStatusId = p.Id
                FROM dbo.GLvMAIN m
                INNER JOIN dbo.ApprovalStatuses p ON p.Code = N'posted'
                WHERE m.vPost = 1;
                UPDATE m
                SET m.ApprovalStatusId = d.Id
                FROM dbo.GLvMAIN m
                INNER JOIN dbo.ApprovalStatuses d ON d.Code = N'deleted'
                WHERE m.vCancel = 1 AND m.vPost = 0;
                UPDATE m
                SET m.ApprovalStatusId = dr.Id
                FROM dbo.GLvMAIN m
                INNER JOIN dbo.ApprovalStatuses dr ON dr.Code = N'draft'
                WHERE m.ApprovalStatusId IS NULL;
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.gen_BranchInfo', 'U') IS NOT NULL
              AND OBJECT_ID('dbo.GLvMAIN', 'U') IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_GLvMAIN_gen_BranchInfo'
                    AND parent_object_id = OBJECT_ID(N'dbo.GLvMAIN'))
            BEGIN
                ALTER TABLE dbo.GLvMAIN ADD CONSTRAINT FK_GLvMAIN_gen_BranchInfo
                    FOREIGN KEY (BranchID) REFERENCES dbo.gen_BranchInfo(BranchID);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GLvDetail', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.GLvDetail(
                    vDetailID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GLvDetail PRIMARY KEY,
                    vID INT NOT NULL,
                    GlAccountID INT NOT NULL,
                    dr DECIMAL(18, 3) NOT NULL CONSTRAINT DF_GLvDetail_dr DEFAULT (0),
                    cr DECIMAL(18, 3) NOT NULL CONSTRAINT DF_GLvDetail_cr DEFAULT (0),
                    Narration NVARCHAR(MAX) NULL,
                    ShowToParty BIT NOT NULL CONSTRAINT DF_GLvDetail_ShowToParty DEFAULT (0),
                    PRBookNo INT NOT NULL CONSTRAINT DF_GLvDetail_PRBookNo DEFAULT (0),
                    CONSTRAINT FK_GLvDetail_GLvMAIN FOREIGN KEY (vID) REFERENCES dbo.GLvMAIN(vID) ON DELETE CASCADE,
                    CONSTRAINT FK_GLvDetail_GLChartOFAccount FOREIGN KEY (GlAccountID) REFERENCES dbo.GLChartOFAccount(GLCAID)
                );
                CREATE INDEX IX_GLvDetail_Voucher ON dbo.GLvDetail(vID);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GLvDetail', 'U') IS NOT NULL AND COL_LENGTH('dbo.GLvDetail', 'TaxAmount') IS NULL
                ALTER TABLE dbo.GLvDetail ADD TaxAmount DECIMAL(18, 3) NULL;
            IF OBJECT_ID('dbo.GLvDetail', 'U') IS NOT NULL AND COL_LENGTH('dbo.GLvDetail', 'PartnerRef') IS NULL
                ALTER TABLE dbo.GLvDetail ADD PartnerRef NVARCHAR(200) NULL;
            IF OBJECT_ID('dbo.GLvDetail', 'U') IS NOT NULL AND COL_LENGTH('dbo.GLvDetail', 'FbrSalesTaxRateId') IS NULL
                ALTER TABLE dbo.GLvDetail ADD FbrSalesTaxRateId INT NULL;
            IF OBJECT_ID('dbo.GLvDetail', 'U') IS NOT NULL AND COL_LENGTH('dbo.GLvDetail', 'PartyID') IS NULL
                ALTER TABLE dbo.GLvDetail ADD PartyID INT NULL;
            IF OBJECT_ID('dbo.GLvDetail', 'U') IS NOT NULL AND COL_LENGTH('dbo.GLvDetail', 'FbrSalesTaxRateIdsJson') IS NULL
                ALTER TABLE dbo.GLvDetail ADD FbrSalesTaxRateIdsJson NVARCHAR(500) NULL;
            IF OBJECT_ID('dbo.GLvMAIN', 'U') IS NOT NULL AND COL_LENGTH('dbo.GLvMAIN', 'LogSourceID') IS NULL
                ALTER TABLE dbo.GLvMAIN ADD LogSourceID INT NOT NULL CONSTRAINT DF_GLvMAIN_LogSourceID DEFAULT (0);
            IF OBJECT_ID('dbo.GLvDetail', 'U') IS NOT NULL AND COL_LENGTH('dbo.GLvDetail', 'IsLog') IS NULL
                ALTER TABLE dbo.GLvDetail ADD IsLog BIT NOT NULL CONSTRAINT DF_GLvDetail_IsLog DEFAULT (0);
            """,
            ct
        );

        // PES scheme master/detail (trimmed; no FKs to tables not shipped in this app)
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.gen_Pes_SchemeInfo', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.gen_Pes_SchemeInfo(
                    SchemeID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_gen_Pes_SchemeInfo PRIMARY KEY,
                    CompanyID INT NULL,
                    Title NVARCHAR(500) NULL,
                    ShortCode NVARCHAR(50) NULL,
                    LogSourceID INT NOT NULL CONSTRAINT DF_gen_Pes_SchemeInfo_LogSourceID DEFAULT (0),
                    SchemeApproval TINYINT NOT NULL CONSTRAINT DF_gen_Pes_SchemeInfo_SchemeApproval DEFAULT (0),
                    IsTaxable BIT NOT NULL CONSTRAINT DF_gen_Pes_SchemeInfo_IsTaxable DEFAULT (0),
                    SwitchType INT NOT NULL CONSTRAINT DF_gen_Pes_SchemeInfo_SwitchType DEFAULT (0)
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.gen_Pes_SchemeDetail', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.gen_Pes_SchemeDetail(
                    SchemeDetailID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_gen_Pes_SchemeDetail PRIMARY KEY,
                    SchemeID INT NOT NULL,
                    ItemId INT NULL,
                    Qauntity DECIMAL(18, 3) NULL,
                    Rate DECIMAL(18, 3) NULL,
                    Discount DECIMAL(18, 3) NULL,
                    NetAmount DECIMAL(18, 3) NULL,
                    Remarks VARCHAR(300) NULL,
                    IsLog BIT NOT NULL CONSTRAINT DF_gen_Pes_SchemeDetail_IsLog DEFAULT (0),
                    CONSTRAINT FK_gen_Pes_SchemeDetail_SchemeInfo FOREIGN KEY (SchemeID) REFERENCES dbo.gen_Pes_SchemeInfo(SchemeID)
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GLvDetail', 'U') IS NOT NULL AND COL_LENGTH('dbo.GLvDetail', 'SchemeId') IS NULL
                ALTER TABLE dbo.GLvDetail ADD SchemeId INT NULL;
            IF OBJECT_ID('dbo.GLvDetail', 'U') IS NOT NULL
              AND COL_LENGTH('dbo.GLvDetail', 'SchemeId') IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM sys.indexes WHERE name = N'IX_GLvDetail_SchemeId'
                    AND object_id = OBJECT_ID(N'dbo.GLvDetail'))
                CREATE INDEX IX_GLvDetail_SchemeId ON dbo.GLvDetail(SchemeId);
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.AppRecordMessages', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.AppRecordMessages(
                    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_AppRecordMessages PRIMARY KEY,
                    CompanyId INT NOT NULL,
                    ResourceKey NVARCHAR(64) NOT NULL,
                    RecordKey NVARCHAR(64) NOT NULL,
                    Kind TINYINT NOT NULL CONSTRAINT DF_AppRecordMessages_Kind DEFAULT (0),
                    SystemAction NVARCHAR(32) NULL,
                    Body NVARCHAR(MAX) NOT NULL CONSTRAINT DF_AppRecordMessages_Body DEFAULT (N''),
                    AuthorUserId UNIQUEIDENTIFIER NULL,
                    AuthorDisplayName NVARCHAR(200) NULL,
                    CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_AppRecordMessages_Created DEFAULT (SYSUTCDATETIME()),
                    AttachmentsJson NVARCHAR(MAX) NULL,
                    MentionedUserIdsJson NVARCHAR(MAX) NULL
                );
                CREATE INDEX IX_AppRecordMessages_Target ON dbo.AppRecordMessages(CompanyId, ResourceKey, RecordKey);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GLvMAIN', 'U') IS NOT NULL AND COL_LENGTH('dbo.GLvMAIN', 'BankCashGlAccountId') IS NULL
            BEGIN
                ALTER TABLE dbo.GLvMAIN ADD BankCashGlAccountId INT NULL;
            END
            IF OBJECT_ID('dbo.GLvMAIN', 'U') IS NOT NULL
              AND COL_LENGTH('dbo.GLvMAIN', 'BankCashGlAccountId') IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_GLvMAIN_BankCash_GLChart'
                    AND parent_object_id = OBJECT_ID(N'dbo.GLvMAIN'))
              AND OBJECT_ID('dbo.GLChartOFAccount', 'U') IS NOT NULL
            BEGIN
                ALTER TABLE dbo.GLvMAIN ADD CONSTRAINT FK_GLvMAIN_BankCash_GLChart
                    FOREIGN KEY (BankCashGlAccountId) REFERENCES dbo.GLChartOFAccount(GLCAID);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.GLvMAIN', 'U') IS NOT NULL AND COL_LENGTH('dbo.GLvMAIN', 'ChequeNo') IS NULL
            BEGIN
                ALTER TABLE dbo.GLvMAIN ADD ChequeNo NVARCHAR(50) NULL;
            END
            IF OBJECT_ID('dbo.GLvMAIN', 'U') IS NOT NULL AND COL_LENGTH('dbo.GLvMAIN', 'ChequeDate') IS NULL
            BEGIN
                ALTER TABLE dbo.GLvMAIN ADD ChequeDate DATE NULL;
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.gen_BankInformation', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.gen_BankInformation(
                    BankInfoID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_gen_BankInformation PRIMARY KEY,
                    EntryUserID INT NULL,
                    EntryUserDateTime DATETIME NULL,
                    ModifyUserID INT NULL,
                    ModifyUserDateTime DATETIME NULL,
                    CompanyID INT NULL,
                    BankAccountTitle NVARCHAR(MAX) NULL,
                    GLCAID INT NULL,
                    BankAccountNumber NVARCHAR(MAX) NULL,
                    BankName NVARCHAR(MAX) NULL,
                    BankBranchCode NVARCHAR(50) NULL,
                    BankAddress NVARCHAR(MAX) NULL
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.gen_BankInformation', 'U') IS NOT NULL
              AND COL_LENGTH('dbo.gen_BankInformation', 'BankAddress') IS NULL
            BEGIN
                ALTER TABLE dbo.gen_BankInformation ADD BankAddress NVARCHAR(MAX) NULL;
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.gen_CashInformation', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.gen_CashInformation(
                    CashInfoID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_gen_CashInformation PRIMARY KEY,
                    EntryUserID INT NULL,
                    EntryUserDateTime DATETIME NULL,
                    ModifyUserID INT NULL,
                    ModifyUserDateTime DATETIME NULL,
                    CompanyID INT NULL,
                    AccountTitle NVARCHAR(50) NULL,
                    CashAccount INT NULL,
                    BranchID INT NULL
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.gen_CashInformationUser', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.gen_CashInformationUser(
                    CashInfoID INT NOT NULL,
                    UserId UNIQUEIDENTIFIER NOT NULL,
                    CONSTRAINT PK_gen_CashInformationUser PRIMARY KEY (CashInfoID, UserId),
                    CONSTRAINT FK_gen_CashInformationUser_CashInfo
                        FOREIGN KEY (CashInfoID) REFERENCES dbo.gen_CashInformation(CashInfoID) ON DELETE CASCADE
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.gen_CashInformationUser', 'U') IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_gen_CashInformationUser_Users'
                    AND parent_object_id = OBJECT_ID(N'dbo.gen_CashInformationUser'))
              AND OBJECT_ID('dbo.Users', 'U') IS NOT NULL
            BEGIN
                ALTER TABLE dbo.gen_CashInformationUser ADD CONSTRAINT FK_gen_CashInformationUser_Users
                    FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE CASCADE;
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.gen_BankInformation', 'U') IS NOT NULL
              AND COL_LENGTH('dbo.gen_BankInformation', 'ValidateChequeBook') IS NULL
            BEGIN
                ALTER TABLE dbo.gen_BankInformation ADD ValidateChequeBook BIT NOT NULL
                    CONSTRAINT DF_gen_BankInformation_ValidateChequeBook DEFAULT (0);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.gen_CheckBookInfo', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.gen_CheckBookInfo(
                    CheckBookID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_gen_CheckBookInfo PRIMARY KEY,
                    EntryUserID INT NULL,
                    EntryUserDateTime DATETIME NULL,
                    ModifyUserID INT NULL,
                    ModifyUserDateTime DATETIME NULL,
                    CompanyID INT NULL,
                    BankId INT NULL,
                    SerialNoStart NUMERIC(18,0) NULL,
                    SerialNoEnd NUMERIC(18,0) NULL,
                    BranchID INT NULL,
                    IsActive BIT NOT NULL CONSTRAINT DF_gen_CheckBookInfo_IsActive DEFAULT (0)
                );
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.gen_CheckBookInfo', 'U') IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_gen_CheckBookInfo_gen_BankInformation'
                    AND parent_object_id = OBJECT_ID(N'dbo.gen_CheckBookInfo'))
              AND OBJECT_ID('dbo.gen_BankInformation', 'U') IS NOT NULL
            BEGIN
                ALTER TABLE dbo.gen_CheckBookInfo ADD CONSTRAINT FK_gen_CheckBookInfo_gen_BankInformation
                    FOREIGN KEY (BankId) REFERENCES dbo.gen_BankInformation(BankInfoID);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.gen_CheckBookInfo', 'U') IS NOT NULL
              AND OBJECT_ID('dbo.gen_BranchInfo', 'U') IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_gen_CheckBookInfo_gen_BranchInfo'
                    AND parent_object_id = OBJECT_ID(N'dbo.gen_CheckBookInfo'))
            BEGIN
                ALTER TABLE dbo.gen_CheckBookInfo ADD CONSTRAINT FK_gen_CheckBookInfo_gen_BranchInfo
                    FOREIGN KEY (BranchID) REFERENCES dbo.gen_BranchInfo(BranchID);
            END
            """,
            ct
        );

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.gen_CheckBookCancelledSerial', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.gen_CheckBookCancelledSerial(
                    CheckBookID INT NOT NULL,
                    SerialNo NUMERIC(18,0) NOT NULL,
                    CONSTRAINT PK_gen_CheckBookCancelledSerial PRIMARY KEY (CheckBookID, SerialNo),
                    CONSTRAINT FK_gen_CheckBookCancelledSerial_CheckBook
                        FOREIGN KEY (CheckBookID) REFERENCES dbo.gen_CheckBookInfo(CheckBookID) ON DELETE CASCADE
                );
            END
            """,
            ct
        );

        // Phase tags (reusable colored tags across the app)
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.gen_Pes_PhaseTags', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.gen_Pes_PhaseTags(
                    PhaseTagID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_gen_Pes_PhaseTags PRIMARY KEY,
                    TagName NVARCHAR(200) NOT NULL,
                    CompanyID INT NULL,
                    EntryUserID INT NULL,
                    EntryUserDateTime DATETIME NULL,
                    TagColor NVARCHAR(20) NULL
                );
            END
            """,
            ct
        );

        // Generic tag links (resource + record id) so tags can be reused across modules.
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID('dbo.gen_Pes_PhaseTagLinks', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.gen_Pes_PhaseTagLinks(
                    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_gen_Pes_PhaseTagLinks PRIMARY KEY,
                    CompanyID INT NOT NULL,
                    ResourceKey NVARCHAR(64) NOT NULL,
                    RecordId INT NOT NULL,
                    PhaseTagID INT NOT NULL,
                    CONSTRAINT FK_gen_Pes_PhaseTagLinks_Tag FOREIGN KEY (PhaseTagID) REFERENCES dbo.gen_Pes_PhaseTags(PhaseTagID)
                );
                CREATE INDEX IX_gen_Pes_PhaseTagLinks_Target ON dbo.gen_Pes_PhaseTagLinks(CompanyID, ResourceKey, RecordId);
                CREATE UNIQUE INDEX UX_gen_Pes_PhaseTagLinks_Unique ON dbo.gen_Pes_PhaseTagLinks(CompanyID, ResourceKey, RecordId, PhaseTagID);
            END
            """,
            ct
        );
    }
}

