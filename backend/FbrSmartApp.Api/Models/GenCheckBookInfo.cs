using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models;

[Table("gen_CheckBookInfo")]
public sealed class GenCheckBookInfo
{
    [Key]
    [Column("CheckBookID")]
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

    /// <summary>FK to gen_BankInformation.BankInfoID</summary>
    [Column("BankId")]
    public int? BankId { get; set; }

    public GenBankInformation? Bank { get; set; }

    [Column("SerialNoStart")]
    public decimal? SerialNoStart { get; set; }

    [Column("SerialNoEnd")]
    public decimal? SerialNoEnd { get; set; }

    [Column("BranchID")]
    public int? BranchId { get; set; }

    [Column("IsActive")]
    public bool IsActive { get; set; }

    public ICollection<GenCheckBookCancelledSerial> CancelledSerials { get; set; } =
        new List<GenCheckBookCancelledSerial>();
}
