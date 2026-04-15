using DocumentFormat.OpenXml;
using FbrSmartApp.Api.Models;
using FbrSmartApp_Auth.Models;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Data;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<ColorInfo> ColorInfos => Set<ColorInfo>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<VehicleGroup> VehicleGroups => Set<VehicleGroup>();
    public DbSet<VehicleInfo> VehicleInfos => Set<VehicleInfo>();
public DbSet<BankInformation> BankInformations { get; set; }

 public DbSet<ProductProfile> ProductProfiles => Set<ProductProfile>();
    public DbSet<ProductProfileChatterMessage> ProductProfileChatterMessages =>
        Set<ProductProfileChatterMessage>();
    public DbSet<FbrSaleType> FbrSaleTypes => Set<FbrSaleType>();
    public DbSet<FbrRate> FbrRates => Set<FbrRate>();
    public DbSet<FbrSroSchedule> FbrSroSchedules => Set<FbrSroSchedule>();
    public DbSet<FbrSroItem> FbrSroItems => Set<FbrSroItem>();
    public DbSet<FbrProvinceData> FbrProvinces => Set<FbrProvinceData>();
    public DbSet<CustomerParty> Customers => Set<CustomerParty>();
    public DbSet<FbrInvoice> FbrInvoices => Set<FbrInvoice>();
    public DbSet<FbrInvoiceLine> FbrInvoiceLines => Set<FbrInvoiceLine>();
    public DbSet<FbrInvoiceChatterMessage> FbrInvoiceChatterMessages => Set<FbrInvoiceChatterMessage>();
    public DbSet<CompanyChatterMessage> CompanyChatterMessages => Set<CompanyChatterMessage>();
    public DbSet<FbrPdiProvince> FbrPdiProvinces => Set<FbrPdiProvince>();
    public DbSet<FbrPdiDocType> FbrPdiDocTypes => Set<FbrPdiDocType>();
    public DbSet<FbrPdiItemDescCode> FbrPdiItemDescCodes => Set<FbrPdiItemDescCode>();
    public DbSet<FbrPdiTransType> FbrPdiTransTypes => Set<FbrPdiTransType>();
    public DbSet<FbrPdiUom> FbrPdiUoms => Set<FbrPdiUom>();
    public DbSet<FbrPdiSaleTypeRate> FbrPdiSaleTypeRates => Set<FbrPdiSaleTypeRate>();
    public DbSet<FbrPdiSyncState> FbrPdiSyncStates => Set<FbrPdiSyncState>();
    public DbSet<FbrScenario> FbrScenarios => Set<FbrScenario>();
    public DbSet<FbrSalesTaxRate> FbrSalesTaxRates => Set<FbrSalesTaxRate>();
    public DbSet<FbrSalesTaxRateChatterMessage> FbrSalesTaxRateChatterMessages => Set<FbrSalesTaxRateChatterMessage>();
    public DbSet<GlChartOfAccount> GlChartOfAccounts => Set<GlChartOfAccount>();
    public DbSet<GlAccountType> GlAccountTypes => Set<GlAccountType>();
    public DbSet<GenBranchInfo> GenBranchInfos => Set<GenBranchInfo>();
    public DbSet<GlChartOfAccountBranchDetail> GlChartOfAccountBranchDetails => Set<GlChartOfAccountBranchDetail>();
    public DbSet<DataRegisterCurrency> DataRegisterCurrencies => Set<DataRegisterCurrency>();
    public DbSet<GlVoucherType> GlVoucherTypes => Set<GlVoucherType>();
    public DbSet<ApprovalStatus> ApprovalStatuses => Set<ApprovalStatus>();
    public DbSet<GlVoucherMain> GlVoucherMains => Set<GlVoucherMain>();
    public DbSet<GlVoucherDetail> GlVoucherDetails => Set<GlVoucherDetail>();
    public DbSet<GenBankInformation> GenBankInformations => Set<GenBankInformation>();
    public DbSet<GenCheckBookInfo> GenCheckBookInfos => Set<GenCheckBookInfo>();
    public DbSet<GenCheckBookCancelledSerial> GenCheckBookCancelledSerials => Set<GenCheckBookCancelledSerial>();
    public DbSet<GenCashInformation> GenCashInformations => Set<GenCashInformation>();
    public DbSet<GenCashInformationUser> GenCashInformationUsers => Set<GenCashInformationUser>();
    public DbSet<AppRecordMessage> AppRecordMessages => Set<AppRecordMessage>();
    public DbSet<SecurityGroup> SecurityGroups => Set<SecurityGroup>();
    public DbSet<UserSecurityGroup> UserSecurityGroups => Set<UserSecurityGroup>();
    public DbSet<GroupAccessRight> GroupAccessRights => Set<GroupAccessRight>();
    public DbSet<GroupRecordRule> GroupRecordRules => Set<GroupRecordRule>();
    public DbSet<RecordRuleModelFieldSetting> RecordRuleModelFieldSettings => Set<RecordRuleModelFieldSetting>();
    public DbSet<GroupMenuGrant> GroupMenuGrants => Set<GroupMenuGrant>();
    public DbSet<SecurityGroupInheritance> SecurityGroupInheritances => Set<SecurityGroupInheritance>();


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(x => x.Username).IsUnique();
            entity.Property(x => x.CompanyId).IsRequired();
            entity.Property(x => x.Username).HasMaxLength(100).IsRequired();
            entity.Property(x => x.FullName).HasMaxLength(200).IsRequired();
            entity.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
            entity.Property(x => x.Role).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(200);
            entity.Property(x => x.PreferredLanguage).HasMaxLength(32).IsRequired();
            entity.Property(x => x.TimeZoneId).HasMaxLength(120).IsRequired();
            entity.Property(x => x.EmailSignature).HasMaxLength(4000);
            entity.Property(x => x.CalendarDefaultPrivacy).HasMaxLength(32).IsRequired();
            entity.Property(x => x.NotificationChannel).HasMaxLength(16).IsRequired();
            entity.Property(x => x.AllowedCompanyIdsJson).HasMaxLength(500).IsRequired();
            entity.Property(x => x.ProfileImage).HasMaxLength(400);
            entity.Property(x => x.AccessRightsJson).HasColumnType("nvarchar(max)");
            entity.Property(x => x.PermissionsJson).HasColumnType("nvarchar(max)");

            entity.HasMany(x => x.SecurityGroupLinks)
                .WithOne(x => x.User)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.Property(x => x.TokenHash).HasMaxLength(200).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.ExpiresAtUtc).IsRequired();
            entity.Property(x => x.RevokedAtUtc);
            entity.Property(x => x.ReplacedByTokenHash).HasMaxLength(200);

            entity
                .HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProductProfile>(entity =>
        {
            entity.HasIndex(x => new { x.CompanyId, x.ProductNo }).IsUnique();
            entity.Property(x => x.CompanyId).IsRequired();
            entity.Property(x => x.ProductNo).HasMaxLength(50).IsRequired();
            entity.Property(x => x.ProductName).HasMaxLength(200).IsRequired();
            entity.Property(x => x.HsCode).HasMaxLength(50).IsRequired();
            entity.Property(x => x.RateValue).HasPrecision(18, 4);
            entity.Property(x => x.PurchasePrice).HasPrecision(18, 4);
            entity.Property(x => x.FbrProductType).HasMaxLength(64);
            entity.Property(x => x.SroScheduleNoText).HasMaxLength(500);
            entity.Property(x => x.SroItemRefText).HasMaxLength(500);
            entity.Property(x => x.ProductImage).HasMaxLength(400);
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.FbrUomId);
            entity.Property(x => x.FbrPdiTransTypeId);
        });

        modelBuilder.Entity<ProductProfileChatterMessage>(entity =>
        {
            entity.ToTable("ProductProfileChatterMessages");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Body).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.AuthorDisplayName).HasMaxLength(200);
            entity.Property(x => x.AttachmentsJson).HasColumnType("nvarchar(max)");
            entity
                .HasOne<ProductProfile>()
                .WithMany(x => x.ChatterMessages)
                .HasForeignKey(x => x.ProductProfileId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => x.ProductProfileId);
        });

        modelBuilder.Entity<Company>(entity =>
        {
            entity.ToTable("GLCompany");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Title).HasMaxLength(100).IsRequired();
            entity.Property(x => x.ShortTitle).HasMaxLength(10).IsRequired();
            entity.Property(x => x.CompanyImage).HasMaxLength(200);

            entity.Property(x => x.EnableSandBox).IsRequired();
            entity.Property(x => x.FbrTokenSandBox);
            entity.Property(x => x.FbrTokenProduction);
            entity.Property(x => x.FbrProvinceId);
            entity.Property(x => x.IsActivated).IsRequired();
            entity.Property(x => x.EmployeeCount);
        });

        modelBuilder.Entity<FbrSaleType>(entity =>
        {
            entity.Property(x => x.Description).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<FbrRate>(entity =>
        {
            entity.Property(x => x.RateDesc).HasMaxLength(300).IsRequired();
            entity.Property(x => x.RateValue).HasPrecision(18, 4);
        });

        modelBuilder.Entity<FbrSroSchedule>(entity =>
        {
            entity.Property(x => x.SroDesc).HasMaxLength(400).IsRequired();
            entity.Property(x => x.SerNo).HasMaxLength(100);
        });

        modelBuilder.Entity<FbrSroItem>(entity =>
        {
            entity.Property(x => x.SroItemDesc).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<FbrProvinceData>(entity =>
        {
            entity.ToTable("Fbr_ProvinceData");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Provincename).HasMaxLength(350);
        });

        modelBuilder.Entity<CustomerParty>(entity =>
        {
            entity.ToTable("gen_PartiesInfo");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.PartyName).HasMaxLength(100);
            entity.Property(x => x.PartyBusinessName).HasMaxLength(350);
            entity.Property(x => x.AddressOne).HasMaxLength(300);
            entity.Property(x => x.PhoneOne).HasMaxLength(50);
            entity.Property(x => x.ContactPerson).HasMaxLength(100);
            entity.Property(x => x.ContactPersonMobile).HasMaxLength(150);
            entity.Property(x => x.Email).HasMaxLength(200);
            entity.Property(x => x.NTNNO).HasMaxLength(30);
            entity.Property(x => x.SaleTaxRegNo).HasMaxLength(30);
            entity.Property(x => x.PartyBusinessLogo).HasMaxLength(400);
        });

        modelBuilder.Entity<FbrInvoice>(entity =>
        {
            entity.ToTable("FbrInvoices");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Reference).HasMaxLength(50);
            entity.Property(x => x.InvoiceNumber).HasMaxLength(32);
            entity.Property(x => x.PaymentTerms).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(30).IsRequired();
            entity.Property(x => x.FbrInvoiceNumber).HasMaxLength(100);
            entity.Property(x => x.IsLocked).IsRequired();
            entity.Property(x => x.FbrLastResponseJson).HasColumnType("nvarchar(max)");
            entity.Property(x => x.FbrLastError).HasMaxLength(2000);
            entity.Property(x => x.CreatedByDisplayName).HasMaxLength(200);
            entity.Property(x => x.UpdatedByDisplayName).HasMaxLength(200);
            entity.Property(x => x.DeliveryFees).HasPrecision(18, 4);
            entity.Property(x => x.TotalExTaxes).HasPrecision(18, 4);
            entity.Property(x => x.Taxes).HasPrecision(18, 4);
            entity.Property(x => x.Total).HasPrecision(18, 4);
            entity.Property(x => x.TaxRate).HasPrecision(18, 6);
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.UpdatedAtUtc).IsRequired();
            entity.Property(x => x.FbrScenarioId);
            entity.Property(x => x.ExcelUniqueInvoiceId);
            entity.HasIndex(x => new { x.CompanyId, x.ExcelUniqueInvoiceId })
                .IsUnique()
                .HasDatabaseName("UX_FbrInvoices_Company_ExcelUniqueInvoiceId")
                .HasFilter("[ExcelUniqueInvoiceId] IS NOT NULL");
        });

        modelBuilder.Entity<FbrInvoiceLine>(entity =>
        {
            entity.ToTable("FbrInvoiceLines");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Quantity).HasPrecision(18, 4);
            entity.Property(x => x.UnitPrice).HasPrecision(18, 4);
            entity.Property(x => x.TaxRate).HasPrecision(18, 6);
            entity.Property(x => x.DiscountRate).HasPrecision(18, 6);
            entity.Property(x => x.HsCode).HasMaxLength(50).IsRequired();
            entity.Property(x => x.SroItemText).HasMaxLength(500).IsRequired();
            entity.Property(x => x.Remarks).HasMaxLength(500).IsRequired();
            entity.Property(x => x.FbrSalesTaxRateId);
            entity.Property(x => x.FbrSalesTaxRateIdsJson).HasMaxLength(500);
            entity
                .HasOne(x => x.Invoice)
                .WithMany(x => x.Lines)
                .HasForeignKey(x => x.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FbrInvoiceChatterMessage>(entity =>
        {
            entity.ToTable("FbrInvoiceChatterMessages");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Body).HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(x => x.AuthorDisplayName).HasMaxLength(200);
            entity.Property(x => x.AttachmentsJson).HasColumnType("nvarchar(max)");
            entity
                .HasOne(x => x.Invoice)
                .WithMany(x => x.ChatterMessages)
                .HasForeignKey(x => x.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CompanyChatterMessage>(entity =>
        {
            entity.ToTable("CompanyChatterMessages");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Body).HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(x => x.AuthorDisplayName).HasMaxLength(200);
            entity.Property(x => x.AttachmentsJson).HasColumnType("nvarchar(max)");
            entity.HasIndex(x => x.CompanyId);
        });

        modelBuilder.Entity<FbrPdiProvince>(entity =>
        {
            entity.ToTable("FbrPdiProvinces");
            entity.HasKey(x => new { x.CompanyId, x.StateProvinceCode });
            entity.Property(x => x.Description).HasMaxLength(350).IsRequired();
            entity.Property(x => x.SyncedAtUtc).IsRequired();
        });

        modelBuilder.Entity<FbrPdiDocType>(entity =>
        {
            entity.ToTable("FbrPdiDocTypes");
            entity.HasKey(x => new { x.CompanyId, x.DocTypeId });
            entity.Property(x => x.Description).HasMaxLength(400).IsRequired();
            entity.Property(x => x.SyncedAtUtc).IsRequired();
        });

        modelBuilder.Entity<FbrPdiItemDescCode>(entity =>
        {
            entity.ToTable("FbrPdiItemDescCodes");
            entity.HasKey(x => new { x.CompanyId, x.HsCode });
            entity.Property(x => x.HsCode).HasMaxLength(32).IsRequired();
            entity.Property(x => x.Description).HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(x => x.SyncedAtUtc).IsRequired();
        });

        modelBuilder.Entity<FbrPdiTransType>(entity =>
        {
            entity.ToTable("FbrPdiTransTypes");
            entity.HasKey(x => new { x.CompanyId, x.TransTypeId });
            entity.Property(x => x.Description).HasMaxLength(500).IsRequired();
            entity.Property(x => x.SyncedAtUtc).IsRequired();
        });

        modelBuilder.Entity<FbrPdiUom>(entity =>
        {
            entity.ToTable("FbrPdiUoms");
            entity.HasKey(x => new { x.CompanyId, x.UomId });
            entity.Property(x => x.Description).HasMaxLength(200).IsRequired();
            entity.Property(x => x.SyncedAtUtc).IsRequired();
        });

        modelBuilder.Entity<FbrPdiSaleTypeRate>(entity =>
        {
            entity.ToTable("FbrPdiSaleTypeRates");
            entity.HasKey(x => new { x.CompanyId, x.TransTypeId, x.RateDate, x.OriginationSupplier, x.RateId });
            entity.Property(x => x.RateDesc).HasMaxLength(300).IsRequired();
            entity.Property(x => x.RateValue).HasPrecision(18, 4);
            entity.Property(x => x.RateDate).HasColumnType("date");
            entity.Property(x => x.SyncedAtUtc).IsRequired();
        });

        modelBuilder.Entity<FbrPdiSyncState>(entity =>
        {
            entity.ToTable("FbrPdiSyncState");
            entity.HasKey(x => x.CompanyId);
            entity.Property(x => x.LastError).HasMaxLength(2000);
        });

        modelBuilder.Entity<FbrScenario>(entity =>
        {
            entity.ToTable("FbrScenarios");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ScenarioCode).HasMaxLength(20).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(500).IsRequired();
            entity.HasIndex(x => new { x.CompanyId, x.ScenarioCode }).IsUnique();
        });

        modelBuilder.Entity<FbrSalesTaxRate>(entity =>
        {
            entity.ToTable("FbrSalesTaxRates");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Label).HasMaxLength(32).IsRequired();
            entity.Property(x => x.Percentage).HasPrecision(18, 6);
            entity.Property(x => x.EffectiveFrom).HasColumnType("date");
            entity.Property(x => x.EffectiveTo).HasColumnType("date");
            entity.Property(x => x.TaxComputation).HasMaxLength(40).IsRequired();
            entity.Property(x => x.IsActive).IsRequired();
            entity.Property(x => x.TaxType).HasMaxLength(20).IsRequired();
            entity.Property(x => x.TaxScope).HasMaxLength(20);
            entity.Property(x => x.LabelOnInvoices).HasMaxLength(200);
            entity.Property(x => x.Description).HasMaxLength(500);
            entity.Property(x => x.TaxGroup).HasMaxLength(200);
            entity.Property(x => x.IncludeInAnalyticCost).IsRequired();
            entity.Property(x => x.Country).HasMaxLength(120);
            entity.Property(x => x.LegalNotes).HasMaxLength(2000);
            entity.Property(x => x.IncludedInPrice).HasMaxLength(50);
            entity.Property(x => x.AffectBaseOfSubsequentTaxes).IsRequired();
            entity.HasIndex(x => new { x.CompanyId, x.Label, x.EffectiveFrom }).IsUnique();
        });

        modelBuilder.Entity<FbrSalesTaxRateChatterMessage>(entity =>
        {
            entity.ToTable("FbrSalesTaxRateChatterMessages");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Body).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.AuthorDisplayName).HasMaxLength(200);
            entity.Property(x => x.AttachmentsJson).HasColumnType("nvarchar(max)");
            entity
                .HasOne<FbrSalesTaxRate>()
                .WithMany(x => x.ChatterMessages)
                .HasForeignKey(x => x.SalesTaxRateId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => x.SalesTaxRateId);
        });

        modelBuilder.Entity<GlAccountType>(entity =>
        {
            entity.ToTable("GLAccontType");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(100);
            entity.Property(x => x.ReportingHead).HasMaxLength(500);
        });

        modelBuilder.Entity<GlChartOfAccount>(entity =>
        {
            entity.ToTable("GLChartOFAccount");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.GlCode).HasMaxLength(500);
            entity.Property(x => x.GlTitle).HasMaxLength(500);
            entity.Property(x => x.AccountCurrency).HasMaxLength(10);
            entity.Property(x => x.EntryBy).HasMaxLength(50);
            entity.Property(x => x.AccountLevelOne).HasMaxLength(10).IsRequired();
            entity.Property(x => x.AccountLevelTwo).HasMaxLength(10);
            entity.Property(x => x.AccountLevelThree).HasMaxLength(10);
            entity.Property(x => x.AccountLevelFour).HasMaxLength(10);
            entity.Property(x => x.AccountLevelFive).HasMaxLength(10);
            entity.Property(x => x.AccountLevelSix).HasMaxLength(10);
            entity.Property(x => x.AccountLevelSeven).HasMaxLength(10);
            entity.Property(x => x.AccountLevelEight).HasMaxLength(10);
            entity.Property(x => x.AccountLevelNine).HasMaxLength(10);
            entity.Property(x => x.AccountLevelTen).HasMaxLength(10);
            entity.Property(x => x.OldGlCode).HasMaxLength(250);
            entity.Property(x => x.Status).IsRequired();
            entity.Property(x => x.ReadOnly).IsRequired();
            entity.Property(x => x.AllowReconciliation).IsRequired();
            entity.HasIndex(x => x.CompanyId);
            entity.Property(x => x.ChartAccountGroupKey).HasMaxLength(36);
        });

        modelBuilder.Entity<GenBranchInfo>(entity =>
        {
            entity.ToTable("gen_BranchInfo");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.BranchName).HasMaxLength(100);
            entity.Property(x => x.BranchCode).HasMaxLength(50);
            entity.Property(x => x.BranchNumber).HasMaxLength(50);
            entity.Property(x => x.BranchEmail).HasMaxLength(50);
            entity.Property(x => x.BranchAddress).HasMaxLength(200);
            entity.Property(x => x.BranchDescription).HasMaxLength(500);
            entity.HasIndex(x => x.CompanyId);
        });

        modelBuilder.Entity<GlChartOfAccountBranchDetail>(entity =>
        {
            entity.ToTable("GLChartOfAccountBranchDetail");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.GlcaId);
            entity.HasIndex(x => x.BranchId);
        });

        modelBuilder.Entity<SecurityGroup>(entity =>
        {
            entity.ToTable("SecurityGroups");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(200).IsRequired();
            entity.Property(x => x.ApplicationScope).HasMaxLength(120);
            entity.Property(x => x.Notes).HasColumnType("nvarchar(max)");
            entity.HasIndex(x => new { x.CompanyId, x.Name });
            entity.HasMany(x => x.UserLinks)
                .WithOne(x => x.SecurityGroup)
                .HasForeignKey(x => x.SecurityGroupId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.AccessRights)
                .WithOne(x => x.SecurityGroup)
                .HasForeignKey(x => x.SecurityGroupId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.RecordRules)
                .WithOne(x => x.SecurityGroup)
                .HasForeignKey(x => x.SecurityGroupId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.MenuGrants)
                .WithOne(x => x.SecurityGroup)
                .HasForeignKey(x => x.SecurityGroupId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.ParentLinks)
                .WithOne(x => x.SecurityGroup)
                .HasForeignKey(x => x.SecurityGroupId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserSecurityGroup>(entity =>
        {
            entity.ToTable("UserSecurityGroups");
            entity.HasKey(x => new { x.UserId, x.SecurityGroupId });
            entity.HasIndex(x => x.SecurityGroupId);
        });

        modelBuilder.Entity<GroupAccessRight>(entity =>
        {
            entity.ToTable("GroupAccessRights");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.DisplayName).HasMaxLength(300).IsRequired();
            entity.Property(x => x.ModelKey).HasMaxLength(120).IsRequired();
            entity.Property(x => x.PermissionsPrefix).HasMaxLength(64).IsRequired();
            entity.HasIndex(x => x.SecurityGroupId);
        });

        modelBuilder.Entity<GroupRecordRule>(entity =>
        {
            entity.ToTable("GroupRecordRules");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(300).IsRequired();
            entity.Property(x => x.ModelKey).HasMaxLength(120).IsRequired();
            entity.Property(x => x.PermissionsPrefix).HasMaxLength(64).IsRequired();
            entity.Property(x => x.Domain).HasColumnType("nvarchar(max)");
            entity.Property(x => x.FieldName).HasMaxLength(120);
            entity.Property(x => x.Operator).HasMaxLength(16);
            entity.Property(x => x.RightOperandJson).HasColumnType("nvarchar(max)");
            entity.HasIndex(x => x.SecurityGroupId);
        });

        modelBuilder.Entity<GroupMenuGrant>(entity =>
        {
            entity.ToTable("GroupMenuGrants");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.MenuKey).HasMaxLength(200).IsRequired();
            entity.HasIndex(x => new { x.SecurityGroupId, x.MenuKey }).IsUnique();
        });

        modelBuilder.Entity<SecurityGroupInheritance>(entity =>
        {
            entity.ToTable("SecurityGroupInheritances");
            entity.HasKey(x => new { x.SecurityGroupId, x.ParentSecurityGroupId });
            entity.HasOne(x => x.ParentGroup)
                .WithMany()
                .HasForeignKey(x => x.ParentSecurityGroupId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<RecordRuleModelFieldSetting>(entity =>
        {
            entity.ToTable("RecordRuleModelFieldSettings");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.PermissionsPrefix).HasMaxLength(64).IsRequired();
            entity.Property(x => x.ModelKey).HasMaxLength(128).IsRequired();
            entity.Property(x => x.FieldName).HasMaxLength(128).IsRequired();
            entity.HasIndex(x => new { x.PermissionsPrefix, x.ModelKey, x.FieldName }).IsUnique();
        });

        modelBuilder.Entity<DataRegisterCurrency>(entity =>
        {
            entity.ToTable("data_RegisterCurrency");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.CurrencyName).HasMaxLength(150).IsRequired();
            entity.Property(x => x.CurrencyShortName).HasMaxLength(50).IsRequired();
            entity.Property(x => x.CurrencySymbol).HasMaxLength(100).IsRequired();
        });

        modelBuilder.Entity<GlVoucherType>(entity =>
        {
            entity.ToTable("GLVoucherType");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(50);
            entity.Property(x => x.Description).HasMaxLength(100);
            entity.Property(x => x.DocumentPrefix).HasMaxLength(32);
            entity.Property(x => x.EntryBy).HasMaxLength(50);
            entity.HasOne(x => x.Currency)
                .WithMany()
                .HasForeignKey(x => x.CurrencyID)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(x => x.DefaultControlGlAccount)
                .WithMany()
                .HasForeignKey(x => x.DefaultControlGlAccountId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(x => x.DefaultIncomeGlAccount)
                .WithMany()
                .HasForeignKey(x => x.DefaultIncomeGlAccountId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.Property(x => x.SignatureName1).HasMaxLength(200);
            entity.Property(x => x.SignatureName2).HasMaxLength(200);
            entity.Property(x => x.SignatureName3).HasMaxLength(200);
            entity.Property(x => x.SignatureName4).HasMaxLength(200);
        });

        modelBuilder.Entity<ApprovalStatus>(entity =>
        {
            entity.ToTable("ApprovalStatuses");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Code).HasMaxLength(32).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(100).IsRequired();
            entity.HasIndex(x => x.Code).IsUnique();
        });

        modelBuilder.Entity<GlVoucherMain>(entity =>
        {
            entity.ToTable("GLvMAIN");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.VoucherNo).HasMaxLength(50);
            entity.Property(x => x.Remarks).HasMaxLength(300);
            entity.Property(x => x.ManualNo).HasMaxLength(50);
            entity.Property(x => x.VoucherDate).HasColumnType("date");
            entity.Property(x => x.TotalDr).HasPrecision(18, 3);
            entity.Property(x => x.TotalCr).HasPrecision(18, 3);
            entity.HasOne(x => x.VoucherType)
                .WithMany()
                .HasForeignKey(x => x.VoucherTypeId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.ApprovalStatus)
                .WithMany()
                .HasForeignKey(x => x.ApprovalStatusId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasMany(x => x.Details)
                .WithOne(x => x.VoucherMain!)
                .HasForeignKey(x => x.VoucherMainId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.BankCashGlAccount)
                .WithMany()
                .HasForeignKey(x => x.BankCashGlAccountId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.Property(x => x.ChequeNo).HasMaxLength(50);
            entity.Property(x => x.ChequeDate).HasColumnType("date");
        });

        modelBuilder.Entity<GenBankInformation>(entity =>
        {
            entity.ToTable("gen_BankInformation");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.BankBranchCode).HasMaxLength(50);
            entity.HasOne(x => x.GlAccount)
                .WithMany()
                .HasForeignKey(x => x.GlcaId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasMany(x => x.CheckBooks)
                .WithOne(x => x.Bank)
                .HasForeignKey(x => x.BankId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<GenCheckBookInfo>(entity =>
        {
            entity.ToTable("gen_CheckBookInfo");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.SerialNoStart).HasPrecision(18, 0);
            entity.Property(x => x.SerialNoEnd).HasPrecision(18, 0);
            entity.HasMany(x => x.CancelledSerials)
                .WithOne(x => x.CheckBook)
                .HasForeignKey(x => x.CheckBookId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<GenCheckBookCancelledSerial>(entity =>
        {
            entity.ToTable("gen_CheckBookCancelledSerial");
            entity.HasKey(x => new { x.CheckBookId, x.SerialNo });
            entity.Property(x => x.SerialNo).HasPrecision(18, 0);
        });

        modelBuilder.Entity<GenCashInformation>(entity =>
        {
            entity.ToTable("gen_CashInformation");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.AccountTitle).HasMaxLength(50);
            entity.HasOne(x => x.GlAccount)
                .WithMany()
                .HasForeignKey(x => x.CashAccount)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasMany(x => x.AllowedUsers)
                .WithOne(x => x.CashInformation)
                .HasForeignKey(x => x.CashInfoId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<GenCashInformationUser>(entity =>
        {
            entity.ToTable("gen_CashInformationUser");
            entity.HasKey(x => new { x.CashInfoId, x.UserId });
            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<GlVoucherDetail>(entity =>
        {
            entity.ToTable("GLvDetail");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Dr).HasPrecision(18, 3);
            entity.Property(x => x.Cr).HasPrecision(18, 3);
            entity.Property(x => x.TaxAmount).HasPrecision(18, 3);
            entity.Property(x => x.PartnerRef).HasMaxLength(200);
            entity.Property(x => x.FbrSalesTaxRateId);
            entity.Property(x => x.FbrSalesTaxRateIdsJson).HasMaxLength(500);
            entity.Property(x => x.Narration).HasColumnType("nvarchar(max)");
            entity.HasOne(x => x.GlAccount)
                .WithMany()
                .HasForeignKey(x => x.GlAccountId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AppRecordMessage>(entity =>
        {
            entity.ToTable("AppRecordMessages");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ResourceKey).HasMaxLength(64).IsRequired();
            entity.Property(x => x.RecordKey).HasMaxLength(64).IsRequired();
            entity.Property(x => x.SystemAction).HasMaxLength(32);
            entity.Property(x => x.Body).HasColumnType("nvarchar(max)");
            entity.Property(x => x.AuthorDisplayName).HasMaxLength(200);
            entity.Property(x => x.AttachmentsJson).HasColumnType("nvarchar(max)");
            entity.Property(x => x.MentionedUserIdsJson).HasColumnType("nvarchar(max)");
            entity.HasIndex(x => new { x.CompanyId, x.ResourceKey, x.RecordKey });
        });
    }

}

public class VariantInfo
{
}