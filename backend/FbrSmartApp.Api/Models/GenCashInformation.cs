using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models;

/// <summary>Maps to dbo.gen_CashInformation — cash books linked to chart GL accounts.</summary>
[Table("gen_CashInformation")]
public sealed class GenCashInformation
{
    [Key]
    [Column("CashInfoID")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Column("EntryUserID")]
    public int? EntryUserId { get; set; }

    [Column("EntryUserDateTime")]
    public DateTime? EntryUserDateTime { get; set; }

    [Column("ModifyUserID")]
    public int? ModifyUserId { get; set; }

    [Column("ModifyUserDateTime")]
    public DateTime? ModifyUserDateTime { get; set; }

    [Column("CompanyID")]
    public int? CompanyId { get; set; }

    [Column("AccountTitle")]
    [MaxLength(50)]
    public string? AccountTitle { get; set; }

    /// <summary>FK to GLChartOFAccount.GLCAID</summary>
    [Column("CashAccount")]
    public int? CashAccount { get; set; }

    [Column("BranchID")]
    public int? BranchId { get; set; }

    public GlChartOfAccount? GlAccount { get; set; }
}
