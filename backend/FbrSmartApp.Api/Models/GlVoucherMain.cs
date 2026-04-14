using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models;

/// <summary>Maps to dbo.GLvMAIN — journal / voucher header.</summary>
[Table("GLvMAIN")]
public sealed class GlVoucherMain
{
    [Key]
    [Column("vID")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    /// <summary>FK to GLVoucherType.Voucherid</summary>
    [Column("vType")]
    public int VoucherTypeId { get; set; }

    [Column("vNO")]
    [MaxLength(50)]
    public string? VoucherNo { get; set; }

    [Column("vDate")]
    public DateTime VoucherDate { get; set; }

    [Column("vremarks")]
    [MaxLength(300)]
    public string? Remarks { get; set; }

    [Column("ManualNo")]
    [MaxLength(50)]
    public string? ManualNo { get; set; }

    [Column("FiscalID")]
    public int? FiscalId { get; set; }

    [Column("Comp_Id")]
    public int CompanyId { get; set; }

    /// <summary>Legacy ERP log-source filter; use ISNULL(LogSourceID,0)=0 when present.</summary>
    [Column("LogSourceID")]
    public int LogSourceId { get; set; }

    [Column("BranchID")]
    public int? BranchId { get; set; }

    [Column("vCancel")]
    public bool Cancelled { get; set; }

    [Column("vPost")]
    public bool Posted { get; set; }

    [Column("vPostedByUserId")]
    public Guid? PostedByUserId { get; set; }

    [Column("vPostedByDate")]
    public DateTime? PostedAtUtc { get; set; }

    [Column("vEnterDate")]
    public DateTime EnteredAtUtc { get; set; }

    [Column("TotalDr")]
    public decimal? TotalDr { get; set; }

    [Column("TotalCr")]
    public decimal? TotalCr { get; set; }

    [Column("ReadOnly")]
    public bool ReadOnly { get; set; }

    /// <summary>FK to ApprovalStatuses — workflow state (draft → approved → confirmed → posted, or deleted).</summary>
    [Column("ApprovalStatusId")]
    public int? ApprovalStatusId { get; set; }

    public ApprovalStatus? ApprovalStatus { get; set; }

    public GlVoucherType? VoucherType { get; set; }

    /// <summary>Optional bank/cash GL account selected on payment & receipt vouchers.</summary>
    [Column("BankCashGlAccountId")]
    public int? BankCashGlAccountId { get; set; }

    public GlChartOfAccount? BankCashGlAccount { get; set; }

    public ICollection<GlVoucherDetail> Details { get; set; } = new List<GlVoucherDetail>();
}
