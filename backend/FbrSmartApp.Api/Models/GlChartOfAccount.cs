using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FbrSmartApp.Api;

namespace FbrSmartApp.Api.Models;

/// <summary>Maps to dbo.GLChartOFAccount (legacy ERP chart of accounts).</summary>
[RecordRuleEntity("accounting", "glChartAccounts")]
public sealed class GlChartOfAccount
{
    [Key]
    [Column("GLCAID")]
    public int Id { get; set; }

    [Column("GLCode")]
    public string? GlCode { get; set; }

    [Column("GLTitle")]
    public string? GlTitle { get; set; }

    [Column("GLType")]
    public int? GlType { get; set; }

    [Column("isParent")]
    public int? IsParent { get; set; }

    [Column("GLNature")]
    public byte? GlNature { get; set; }

    [Column("Fiscalid")]
    public int? FiscalId { get; set; }

    [Column("GLBSid")]
    public int? GlBsId { get; set; }

    [Column("GLPLid")]
    public int? GlPlId { get; set; }

    [Column("Companyid")]
    public int? CompanyId { get; set; }

    [Column("Status")]
    public bool Status { get; set; }

    [Column("EntryBy")]
    public string? EntryBy { get; set; }

    [Column("UserID")]
    public int? UserId { get; set; }

    [Column("AccountLevelOne")]
    public string AccountLevelOne { get; set; } = "";

    [Column("AccountLevelTwo")]
    public string? AccountLevelTwo { get; set; }

    [Column("AccountlevelThree")]
    public string? AccountLevelThree { get; set; }

    [Column("AccountLevelFour")]
    public string? AccountLevelFour { get; set; }

    [Column("AccountLevelFive")]
    public string? AccountLevelFive { get; set; }

    [Column("AccountLevelSix")]
    public string? AccountLevelSix { get; set; }

    [Column("AccountLevelSeven")]
    public string? AccountLevelSeven { get; set; }

    [Column("AccountLevelEight")]
    public string? AccountLevelEight { get; set; }

    [Column("AccountLevelNine")]
    public string? AccountLevelNine { get; set; }

    [Column("AccountLevelTen")]
    public string? AccountLevelTen { get; set; }

    [Column("GLLevel")]
    public byte? GlLevel { get; set; }

    [Column("ReadOnly")]
    public bool ReadOnly { get; set; }

    [Column("OLDGLCODE")]
    public string? OldGlCode { get; set; }

    [Column("AllowReconciliation")]
    public bool AllowReconciliation { get; set; }

    [Column("AccountCurrency")]
    public string? AccountCurrency { get; set; }

    /// <summary>Links rows that represent the same logical account across companies (multi-company mapping).</summary>
    [Column("ChartAccountGroupKey")]
    [MaxLength(36)]
    public string? ChartAccountGroupKey { get; set; }
}
