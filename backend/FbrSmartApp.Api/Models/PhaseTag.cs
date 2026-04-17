using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models;

[Table("gen_Pes_PhaseTags")]
public sealed class PhaseTag
{
    [Key]
    [Column("PhaseTagID")]
    public int Id { get; set; }

    [Column("TagName")]
    [MaxLength(200)]
    public string TagName { get; set; } = "";

    [Column("CompanyID")]
    public int? CompanyId { get; set; }

    [Column("EntryUserID")]
    public int? EntryUserId { get; set; }

    [Column("EntryUserDateTime")]
    public DateTime? EntryUserDateTime { get; set; }

    [Column("TagColor")]
    [MaxLength(20)]
    public string? TagColor { get; set; }
}

