using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models;

/// <summary>Maps to dbo.GLvDetail — voucher line (account, debit, credit).</summary>
[Table("GLvDetail")]
public sealed class GlVoucherDetail
{
    [Key]
    [Column("vDetailID")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Column("vID")]
    public int VoucherMainId { get; set; }

    [Column("GlAccountID")]
    public int GlAccountId { get; set; }

    [Column("dr")]
    public decimal Dr { get; set; }

    [Column("cr")]
    public decimal Cr { get; set; }

    [Column("Narration")]
    public string? Narration { get; set; }

    [Column("ShowToParty")]
    public bool ShowToParty { get; set; }

    [Column("PRBookNo")]
    public int PrBookNo { get; set; }

    [Column("TaxAmount")]
    public decimal? TaxAmount { get; set; }

    [Column("PartnerRef")]
    [MaxLength(200)]
    public string? PartnerRef { get; set; }

    [Column("FbrSalesTaxRateId")]
    public int? FbrSalesTaxRateId { get; set; }

    /// <summary>JSON array of FBR sales tax rate ids (multi-select).</summary>
    [Column("FbrSalesTaxRateIdsJson")]
    public string? FbrSalesTaxRateIdsJson { get; set; }

    /// <summary>FK to gen_PartiesInfo.PartyID (customer / party).</summary>
    [Column("PartyID")]
    public int? PartyId { get; set; }

    public GlVoucherMain? VoucherMain { get; set; }

    public GlChartOfAccount? GlAccount { get; set; }
}
