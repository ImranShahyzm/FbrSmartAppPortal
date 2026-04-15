using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models;

/// <summary>Maps to dbo.gen_BankInformation — bank accounts linked to chart GL accounts.</summary>
[Table("gen_BankInformation")]
public sealed class GenBankInformation
{
    [Key]
    [Column("BankInfoID")]
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

    [Column("BankAccountTitle")]
    public string? BankAccountTitle { get; set; }

    /// <summary>FK to GLChartOFAccount.GLCAID</summary>
    [Column("GLCAID")]
    public int? GlcaId { get; set; }

    [Column("BankAccountNumber")]
    public string? BankAccountNumber { get; set; }

    [Column("BankName")]
    public string? BankName { get; set; }

    [Column("BankBranchCode")]
    [MaxLength(50)]
    public string? BankBranchCode { get; set; }

    [Column("BankAddress")]
    public string? BankAddress { get; set; }

    [Column("ValidateChequeBook")]
    public bool ValidateChequeBook { get; set; }

    public GlChartOfAccount? GlAccount { get; set; }

    public ICollection<GenCheckBookInfo> CheckBooks { get; set; } = new List<GenCheckBookInfo>();
}
