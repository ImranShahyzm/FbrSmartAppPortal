using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FbrSmartApp.Api.Data.Migrations.AppDb
{
    /// <inheritdoc />
    public partial class Rename_ProductProfiles_To_InventItems_AddLegacyColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Rename table (no drop/recreate)
            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'dbo.InventItems', N'U') IS NOT NULL
                    THROW 51000, 'dbo.InventItems already exists; refusing to rename dbo.ProductProfiles to avoid collision.', 1;
                IF OBJECT_ID(N'dbo.ProductProfiles', N'U') IS NULL
                    THROW 51000, 'dbo.ProductProfiles does not exist; cannot rename.', 1;
                """
            );

            migrationBuilder.RenameTable(
                name: "ProductProfiles",
                newName: "InventItems");

            // Rename EF-created unique index if present (keeps naming tidy; safe if missing)
            migrationBuilder.Sql(
                """
                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = N'IX_ProductProfiles_CompanyId_ProductNo'
                      AND object_id = OBJECT_ID(N'dbo.InventItems'))
                BEGIN
                    EXEC sp_rename N'dbo.InventItems.IX_ProductProfiles_CompanyId_ProductNo', N'IX_InventItems_CompanyId_ProductNo', N'INDEX';
                END
                """
            );

            // Add legacy ItemId via SEQUENCE (SQL Server cannot add IDENTITY to existing table)
            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'dbo.InventItems_ItemId_Seq', N'SO') IS NULL
                BEGIN
                    CREATE SEQUENCE dbo.InventItems_ItemId_Seq
                        AS INT
                        START WITH 1
                        INCREMENT BY 1;
                END
                """
            );

            migrationBuilder.Sql(
                """
                IF COL_LENGTH(N'dbo.InventItems', N'ItemId') IS NULL
                BEGIN
                    ALTER TABLE dbo.InventItems
                        ADD ItemId INT NOT NULL
                            CONSTRAINT DF_InventItems_ItemId DEFAULT (NEXT VALUE FOR dbo.InventItems_ItemId_Seq);
                END
                """
            );

            migrationBuilder.Sql(
                """
                IF COL_LENGTH(N'dbo.InventItems', N'ItemId') IS NOT NULL
                   AND NOT EXISTS (
                       SELECT 1 FROM sys.indexes
                       WHERE name = N'UX_InventItems_ItemId'
                         AND object_id = OBJECT_ID(N'dbo.InventItems'))
                BEGIN
                    CREATE UNIQUE NONCLUSTERED INDEX UX_InventItems_ItemId ON dbo.InventItems(ItemId);
                END
                """
            );

            // Add legacy columns (nullable / no new FKs or legacy constraints)
            migrationBuilder.Sql(
                """
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

                -- Columns present in your legacy script but not explicitly covered above
                IF COL_LENGTH(N'dbo.InventItems', N'ItemPackingDec') IS NULL ALTER TABLE dbo.InventItems ADD ItemPackingDec NUMERIC(18,3) NULL;
                """
            );

            // Backward compatibility: ProductProfiles view pointing to InventItems
            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'dbo.ProductProfiles', N'V') IS NOT NULL
                    DROP VIEW dbo.ProductProfiles;
                IF OBJECT_ID(N'dbo.ProductProfiles', N'U') IS NOT NULL
                    THROW 51000, 'dbo.ProductProfiles is still a table after rename; cannot create compatibility view.', 1;

                EXEC(N'
                    CREATE VIEW dbo.ProductProfiles AS
                    SELECT
                        Id,
                        CompanyId,
                        ProductNo,
                        ProductName,
                        HsCode,
                        SaleTypeId,
                        RateId,
                        RateValue,
                        PurchasePrice,
                        SroId,
                        SroItemId,
                        FbrProductType,
                        SroScheduleNoText,
                        SroItemRefText,
                        FixedNotifiedApplicable,
                        MrpRateValue,
                        FbrUomId,
                        FbrPdiTransTypeId,
                        ProductImage,
                        CreatedAtUtc,
                        ItemId,
                        CategoryID,
                        ItemNumber,
                        ItenName,
                        UOMId,
                        ItemBrandId,
                        MaintainInventory,
                        ItemPacking,
                        ItemSalesPrice,
                        ItemPurchasePrice,
                        ItemStatus,
                        ItemPurchaseGL,
                        ItemPurReturnGL,
                        ItemSalesGL,
                        ItemSaleReturnGL,
                        ItemImage,
                        CompanyID AS LegacyCompanyID,
                        TaxGroupID,
                        WeightedRate,
                        WHID,
                        ItemType,
                        ManualNumber,
                        CartonSize,
                        ProductWeightCode,
                        MainItem,
                        Remarks,
                        ItemVarientId,
                        ColorID,
                        UrduName,
                        BardanaID,
                        Make,
                        ItemModel,
                        Range,
                        SerialNo,
                        Accessories,
                        Property,
                        FixAsset,
                        CompanyName,
                        Discount,
                        ItenUrduName,
                        ItemUrduName,
                        WholeSaleRate,
                        ReOrderLevel,
                        ItemGroupID,
                        ItemMainGroupID,
                        SubCategoryID,
                        AttributeId,
                        SeasonType,
                        RegisterInevntoryDate,
                        isFinisH,
                        IsBatchItem,
                        CategoryCode,
                        SrNo,
                        DiscountOnSale,
                        UnitCalculation,
                        PerPieceDiscont,
                        LocationID,
                        ThreshHoldGram,
                        ItemNameEncrypted,
                        ItemPackingDec,
                        ProductDeadLevel,
                        EntryDate,
                        CurrentStock,
                        HSCode AS LegacyHSCode,
                        SROCode,
                        FilerTaxPercentage,
                        NonFilerTaxPercentage,
                        Productionlevel,
                        PackingCharges,
                        MakingCost,
                        PartyIDDs,
                        IsQuatationItem,
                        IsServiceItem,
                        ShowCode,
                        RelaxationQty,
                        RelaxationOn,
                        FactoryItems,
                        SentItems,
                        Length,
                        width,
                        ColorCount,
                        UsagePeriod,
                        ProductPartyID,
                        AccountVoucherID,
                        IsCylinder,
                        ProductStdWeightInGrams,
                        ItemConfigureType,
                        RateFactor,
                        OdoMeterReading,
                        PerKg
                    FROM dbo.InventItems;
                ');
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'dbo.ProductProfiles', N'V') IS NOT NULL
                    DROP VIEW dbo.ProductProfiles;
                """
            );

            migrationBuilder.Sql(
                """
                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = N'UX_InventItems_ItemId'
                      AND object_id = OBJECT_ID(N'dbo.InventItems'))
                BEGIN
                    DROP INDEX UX_InventItems_ItemId ON dbo.InventItems;
                END
                """
            );

            migrationBuilder.Sql(
                """
                IF COL_LENGTH(N'dbo.InventItems', N'ItemId') IS NOT NULL
                BEGIN
                    ALTER TABLE dbo.InventItems DROP CONSTRAINT DF_InventItems_ItemId;
                    ALTER TABLE dbo.InventItems DROP COLUMN ItemId;
                END
                """
            );

            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'dbo.InventItems_ItemId_Seq', N'SO') IS NOT NULL
                    DROP SEQUENCE dbo.InventItems_ItemId_Seq;
                """
            );

            // Best-effort: drop legacy columns if present
            migrationBuilder.Sql(
                """
                DECLARE @cols TABLE (Name SYSNAME);
                INSERT INTO @cols(Name) VALUES
                    (N'CategoryID'),(N'ItemNumber'),(N'ItenName'),(N'UOMId'),(N'ItemBrandId'),(N'MaintainInventory'),
                    (N'ItemPacking'),(N'ItemSalesPrice'),(N'ItemPurchasePrice'),(N'ItemStatus'),(N'ItemPurchaseGL'),
                    (N'ItemPurReturnGL'),(N'ItemSalesGL'),(N'ItemSaleReturnGL'),(N'ItemImage'),(N'CompanyID'),
                    (N'TaxGroupID'),(N'WeightedRate'),(N'WHID'),(N'ItemType'),(N'ManualNumber'),(N'CartonSize'),
                    (N'ProductWeightCode'),(N'MainItem'),(N'Remarks'),(N'ItemVarientId'),(N'ColorID'),(N'UrduName'),
                    (N'BardanaID'),(N'Make'),(N'ItemModel'),(N'Range'),(N'SerialNo'),(N'Accessories'),(N'Property'),
                    (N'FixAsset'),(N'CompanyName'),(N'Discount'),(N'ItenUrduName'),(N'ItemUrduName'),
                    (N'WholeSaleRate'),(N'ReOrderLevel'),(N'ItemGroupID'),(N'ItemMainGroupID'),(N'SubCategoryID'),
                    (N'AttributeId'),(N'SeasonType'),(N'RegisterInevntoryDate'),(N'isFinisH'),(N'IsBatchItem'),
                    (N'CategoryCode'),(N'SrNo'),(N'DiscountOnSale'),(N'UnitCalculation'),(N'PerPieceDiscont'),
                    (N'LocationID'),(N'ThreshHoldGram'),(N'ItemNameEncrypted'),(N'ItemPackingDec'),
                    (N'ProductDeadLevel'),(N'EntryDate'),(N'CurrentStock'),(N'HSCode'),(N'SROCode'),
                    (N'FilerTaxPercentage'),(N'NonFilerTaxPercentage'),(N'Productionlevel'),(N'PackingCharges'),
                    (N'MakingCost'),(N'PartyIDDs'),(N'IsQuatationItem'),(N'IsServiceItem'),(N'ShowCode'),
                    (N'RelaxationQty'),(N'RelaxationOn'),(N'FactoryItems'),(N'SentItems'),(N'Length'),(N'width'),
                    (N'ColorCount'),(N'UsagePeriod'),(N'ProductPartyID'),(N'AccountVoucherID'),(N'IsCylinder'),
                    (N'ProductStdWeightInGrams'),(N'ItemConfigureType'),(N'RateFactor'),(N'OdoMeterReading'),(N'PerKg');

                DECLARE @sql NVARCHAR(MAX) = N'';
                SELECT @sql = @sql + N'IF COL_LENGTH(N''dbo.InventItems'', N''' + Name + N''') IS NOT NULL ALTER TABLE dbo.InventItems DROP COLUMN [' + Name + N'];' + CHAR(10)
                FROM @cols;
                EXEC sp_executesql @sql;
                """
            );

            // Rename index back if it exists
            migrationBuilder.Sql(
                """
                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = N'IX_InventItems_CompanyId_ProductNo'
                      AND object_id = OBJECT_ID(N'dbo.InventItems'))
                BEGIN
                    EXEC sp_rename N'dbo.InventItems.IX_InventItems_CompanyId_ProductNo', N'IX_ProductProfiles_CompanyId_ProductNo', N'INDEX';
                END
                """
            );

            migrationBuilder.RenameTable(
                name: "InventItems",
                newName: "ProductProfiles");
        }
    }
}
