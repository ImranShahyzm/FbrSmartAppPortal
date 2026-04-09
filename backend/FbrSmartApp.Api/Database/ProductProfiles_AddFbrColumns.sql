/*
  Idempotent column adds for ProductProfiles (mirrors SchemaUpgrader at startup).
  Run manually in SSMS only if you do not use the API startup path that calls SchemaUpgrader.ApplyAsync.
*/
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
