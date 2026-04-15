using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models;

[Table("gen_CashInformationUser")]
public sealed class GenCashInformationUser
{
    [Column("CashInfoID")]
    public int CashInfoId { get; set; }

    public GenCashInformation? CashInformation { get; set; }

    [Column("UserId")]
    public Guid UserId { get; set; }

    public User? User { get; set; }
}

