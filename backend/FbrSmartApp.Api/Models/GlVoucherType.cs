using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models;

/// <summary>Accounting voucher templates (cash/bank/journal, etc.) per company.</summary>
[Table("GLVoucherType")]
public sealed class GlVoucherType
{
    [Key]
    [Column("Voucherid")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [MaxLength(50)]
    public string? Title { get; set; }

    [MaxLength(100)]
    public string? Description { get; set; }

    /// <summary>Short code printed on documents (e.g. INV, BNK).</summary>
    [MaxLength(32)]
    public string? DocumentPrefix { get; set; }

    /// <summary>FK to GLCompany.Companyid</summary>
    public int? Companyid { get; set; }

    public bool Status { get; set; }

    [MaxLength(50)]
    public string? EntryBy { get; set; }

    public int? UserID { get; set; }

    public bool ShowBankAndChequeDate { get; set; }

    /// <summary>0=Sales, 1=Purchase, 2=Cash, 3=Bank, 4=CreditCard, 5=Miscellaneous</summary>
    public int SystemType { get; set; }

    public bool ShowToPartyV { get; set; }

    public bool InterTransferPolicy { get; set; }

    public bool ShowToAccountBook { get; set; }

    public int? CurrencyID { get; set; }

    public DataRegisterCurrency? Currency { get; set; }

    /// <summary>Optional default GL account (types: Receivable, Bank and Cash, Prepayments).</summary>
    public int? DefaultControlGlAccountId { get; set; }

    /// <summary>0 = Debit, 1 = Credit when a control account is set.</summary>
    public byte? ControlAccountTxnNature { get; set; }

    /// <summary>Optional income account (types: Income, Other Income).</summary>
    public int? DefaultIncomeGlAccountId { get; set; }

    public GlChartOfAccount? DefaultControlGlAccount { get; set; }

    public GlChartOfAccount? DefaultIncomeGlAccount { get; set; }

    /// <summary>Number of signature lines on printed voucher (3 or 4).</summary>
    public byte? SignatureSlotCount { get; set; }

    [MaxLength(200)]
    public string? SignatureName1 { get; set; }

    [MaxLength(200)]
    public string? SignatureName2 { get; set; }

    [MaxLength(200)]
    public string? SignatureName3 { get; set; }

    [MaxLength(200)]
    public string? SignatureName4 { get; set; }
}
