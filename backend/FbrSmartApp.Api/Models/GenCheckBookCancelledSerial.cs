using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models;

[Table("gen_CheckBookCancelledSerial")]
public sealed class GenCheckBookCancelledSerial
{
    [Column("CheckBookID")]
    public int CheckBookId { get; set; }

    public GenCheckBookInfo? CheckBook { get; set; }

    [Column("SerialNo")]
    public decimal SerialNo { get; set; }
}
