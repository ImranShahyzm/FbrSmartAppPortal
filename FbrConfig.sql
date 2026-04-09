
/****** Object:  Table [dbo].[GLCompany]    Script Date: 3/31/2026 3:39:35 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[GLCompany](
	[Companyid] [int] IDENTITY(1,1) NOT NULL,
	[Title] [varchar](100) NOT NULL,
	[ShortTitle] [varchar](10) NOT NULL,
	[Email] [nvarchar](50) NULL,
	[Address] [nvarchar](500) NULL,
	[Phone] [nvarchar](50) NULL,
	[website] [nvarchar](100) NULL,
	[NTNNo] [nvarchar](50) NULL,
	[Terms_Condition_1] [nvarchar](max) NULL,
	[Terms_Condition_2] [nvarchar](max) NULL,
	[St_Registration] [nvarchar](50) NULL,
	[CompanyImage] [nvarchar](100) NULL,
	[Inactive] [bit] NOT NULL,
	[SaleEmail] [nvarchar](50) NULL,
	[Terms_Condition_3] [nvarchar](max) NULL,
	[MainCompanyID] [int] NULL,
	[PostalCode] [nvarchar](250) NULL,
	[PoBoxNo] [nvarchar](250) NULL,
	[FaxNo] [nvarchar](250) NULL,
 CONSTRAINT [PK_GLCompany] PRIMARY KEY CLUSTERED 
(
	[Companyid] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [dbo].[GLCompany] ADD  CONSTRAINT [DF_GLCompany_Inactive]  DEFAULT ((0)) FOR [Inactive]
GO




/*
  FBR configuration + Product Profile tables
  Target DB: FbrSmartApp_Auth (or your configured DB)
*/

-- =========================
-- Product registration
-- =========================
IF OBJECT_ID('dbo.ProductProfiles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductProfiles (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ProductProfiles PRIMARY KEY,
        ProductNo NVARCHAR(50) NOT NULL,
        ProductName NVARCHAR(200) NOT NULL,
        HsCode NVARCHAR(50) NOT NULL,

        SaleTypeId INT NULL,
        RateId INT NULL,
        RateValue DECIMAL(18, 4) NULL,
        SroId INT NULL,
        SroItemId INT NULL,
        ProductImage NVARCHAR(400) NULL,

        CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_ProductProfiles_CreatedAtUtc DEFAULT (SYSUTCDATETIME())
    );

    CREATE UNIQUE INDEX UX_ProductProfiles_ProductNo ON dbo.ProductProfiles(ProductNo);
END

-- =========================
-- FBR config lookup tables
-- These tables are meant to mirror what you select in the Tax form:
-- - Sale Type (transaction type)
-- - Rate (Rate Desc / Rate Value)
-- - SRO schedule
-- - SRO items
-- =========================

IF OBJECT_ID('dbo.FbrSaleTypes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.FbrSaleTypes (
        Id INT NOT NULL CONSTRAINT PK_FbrSaleTypes PRIMARY KEY,
        Description NVARCHAR(200) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_FbrSaleTypes_IsActive DEFAULT (1)
    );
END

IF OBJECT_ID('dbo.FbrRates', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.FbrRates (
        Id INT NOT NULL CONSTRAINT PK_FbrRates PRIMARY KEY,
        RateDesc NVARCHAR(300) NOT NULL,
        RateValue DECIMAL(18, 4) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_FbrRates_IsActive DEFAULT (1)
    );
END

IF OBJECT_ID('dbo.FbrSroSchedules', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.FbrSroSchedules (
        Id INT NOT NULL CONSTRAINT PK_FbrSroSchedules PRIMARY KEY,
        SroDesc NVARCHAR(400) NOT NULL,
        SerNo NVARCHAR(100) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_FbrSroSchedules_IsActive DEFAULT (1)
    );
END

IF OBJECT_ID('dbo.FbrSroItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.FbrSroItems (
        Id INT NOT NULL CONSTRAINT PK_FbrSroItems PRIMARY KEY,
        SroId INT NOT NULL,
        SroItemDesc NVARCHAR(200) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_FbrSroItems_IsActive DEFAULT (1),
        CONSTRAINT FK_FbrSroItems_FbrSroSchedules FOREIGN KEY (SroId) REFERENCES dbo.FbrSroSchedules(Id)
    );
END

-- =========================
-- GLCompany extensions (for FBR tokens + environment)
-- =========================
IF OBJECT_ID('dbo.GLCompany', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.GLCompany', 'FbrTokenSandBox') IS NULL
        ALTER TABLE dbo.GLCompany ADD FbrTokenSandBox NVARCHAR(MAX) NULL;

    IF COL_LENGTH('dbo.GLCompany', 'FbrTokenProduction') IS NULL
        ALTER TABLE dbo.GLCompany ADD FbrTokenProduction NVARCHAR(MAX) NULL;

    IF COL_LENGTH('dbo.GLCompany', 'EnableSandBox') IS NULL
        ALTER TABLE dbo.GLCompany ADD EnableSandBox BIT NOT NULL CONSTRAINT DF_GLCompany_EnableSandBox DEFAULT ((1));
END

-- =========================
-- Seed minimal sample data
-- Replace these with your real values (from your existing app / FBR fetch)
-- =========================

IF NOT EXISTS (SELECT 1 FROM dbo.FbrSaleTypes)
BEGIN
    INSERT INTO dbo.FbrSaleTypes (Id, Description) VALUES
    (1, N'Sales (Default)'),
    (2, N'Services'),
    (3, N'Export');
END

IF NOT EXISTS (SELECT 1 FROM dbo.FbrRates)
BEGIN
    INSERT INTO dbo.FbrRates (Id, RateDesc, RateValue) VALUES
    (101, N'Rate 18% (Sales Tax)', 18.0000),
    (102, N'Rate 16% (Services)', 16.0000),
    (103, N'Rate 0% (Zero Rated)', 0.0000);
END

IF NOT EXISTS (SELECT 1 FROM dbo.FbrSroSchedules)
BEGIN
    INSERT INTO dbo.FbrSroSchedules (Id, SroDesc, SerNo) VALUES
    (1001, N'SRO Sample Schedule', N'SRO-1001');
END

IF NOT EXISTS (SELECT 1 FROM dbo.FbrSroItems)
BEGIN
    INSERT INTO dbo.FbrSroItems (Id, SroId, SroItemDesc) VALUES
    (17112, 1001, N'45(i)'),
    (17113, 1001, N'45(ii)');
END

