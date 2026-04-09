using FbrSmartApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Data;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Company> Companies => Set<Company>();
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
    }
}
