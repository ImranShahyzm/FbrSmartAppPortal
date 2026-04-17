using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models;

[Table("gen_Pes_PhaseTagLinks")]
public sealed class PhaseTagLink
{
    [Key]
    public int Id { get; set; }

    [Column("CompanyID")]
    public int CompanyId { get; set; }

    [MaxLength(64)]
    public string ResourceKey { get; set; } = "";

    public int RecordId { get; set; }

    [Column("PhaseTagID")]
    public int PhaseTagId { get; set; }
}

