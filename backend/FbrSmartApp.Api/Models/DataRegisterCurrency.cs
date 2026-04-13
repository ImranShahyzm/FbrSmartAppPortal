using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models;

[Table("data_RegisterCurrency")]
public sealed class DataRegisterCurrency
{
    [Key]
    [Column("CurrencyID")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [MaxLength(150)]
    public string CurrencyName { get; set; } = "";

    [MaxLength(50)]
    public string CurrencyShortName { get; set; } = "";

    [MaxLength(100)]
    public string CurrencySymbol { get; set; } = "";

    public int CurrencyNo { get; set; }

    public bool BaseCurrency { get; set; }

    public bool? CurrencyStatus { get; set; }

    public int? LogSourceID { get; set; }
}
