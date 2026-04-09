using FbrSmartApp.Api.Models.AdminPortal;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Data;

public sealed class AdminPortalDbContext : DbContext
{
    public AdminPortalDbContext(DbContextOptions<AdminPortalDbContext> options) : base(options) { }

    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<AdminRefreshToken> AdminRefreshTokens => Set<AdminRefreshToken>();
    public DbSet<AdminActivity> AdminActivities => Set<AdminActivity>();
    public DbSet<AdminAuditLog> AdminAuditLogs => Set<AdminAuditLog>();
    public DbSet<CompanyOnboarding> CompanyOnboardings => Set<CompanyOnboarding>();
    public DbSet<AdminCompanyChatterMessage> AdminCompanyChatterMessages => Set<AdminCompanyChatterMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AdminUser>(entity =>
        {
            entity.ToTable("AdminUsers");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.Email).IsUnique();
            entity.Property(x => x.Email).HasMaxLength(200).IsRequired();
            entity.Property(x => x.FullName).HasMaxLength(200).IsRequired();
            entity.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
            entity.Property(x => x.Role).HasMaxLength(50).IsRequired();
            entity.Property(x => x.IsActive).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();
        });

        modelBuilder.Entity<AdminRefreshToken>(entity =>
        {
            entity.ToTable("AdminRefreshTokens");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.Property(x => x.TokenHash).HasMaxLength(200).IsRequired();
            entity.Property(x => x.ReplacedByTokenHash).HasMaxLength(200);
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.ExpiresAtUtc).IsRequired();

            entity.HasOne(x => x.AdminUser)
                .WithMany()
                .HasForeignKey(x => x.AdminUserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AdminActivity>(entity =>
        {
            entity.ToTable("AdminActivities");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.AdminEmail).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Action).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Notes).HasMaxLength(2000);
            entity.HasIndex(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.CompanyId);
        });

        modelBuilder.Entity<AdminAuditLog>(entity =>
        {
            entity.ToTable("AdminAuditLogs");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.AdminEmail).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Resource).HasMaxLength(80).IsRequired();
            entity.Property(x => x.Action).HasMaxLength(120).IsRequired();
            entity.Property(x => x.PayloadJson).HasColumnType("nvarchar(max)");
            entity.HasIndex(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.CompanyId);
            entity.HasIndex(x => x.Resource);
        });

        modelBuilder.Entity<CompanyOnboarding>(entity =>
        {
            entity.ToTable("CompanyOnboardings");
            entity.HasKey(x => x.CompanyId);
            // CompanyId must match tenant Company.Id, so it is not DB-generated.
            entity.Property(x => x.CompanyId).ValueGeneratedNever();
            entity.Property(x => x.RegisteredAtUtc).IsRequired();
            entity.Property(x => x.PaymentStatus).HasMaxLength(24).IsRequired();
            entity.Property(x => x.PaymentModel).HasMaxLength(24).IsRequired();
            entity.Property(x => x.PaymentNotes).HasMaxLength(4000);
            entity.Property(x => x.Amount).HasPrecision(18, 2);
            entity.Property(x => x.Currency).HasMaxLength(16);
            entity.Property(x => x.LastUpdatedAtUtc);
            entity.Property(x => x.LastUpdatedByEmail).HasMaxLength(200);
        });

        modelBuilder.Entity<AdminCompanyChatterMessage>(entity =>
        {
            entity.ToTable("AdminCompanyChatterMessages");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Body).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.AuthorEmail).HasMaxLength(200).IsRequired();
            entity.Property(x => x.AuthorDisplayName).HasMaxLength(200);
            entity.Property(x => x.AttachmentsJson).HasColumnType("nvarchar(max)");
            entity.HasIndex(x => x.CompanyId);
            entity.HasIndex(x => x.CreatedAtUtc);
        });
    }
}

