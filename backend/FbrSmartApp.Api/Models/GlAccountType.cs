using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models;

/// <summary>Maps to dbo.GLAccontType (reference data for chart account classification).</summary>
[Table("GLAccontType")]
public sealed class GlAccountType
{
    [Key]
    [Column("AccountTypeID")]
    public int Id { get; set; }

    [Column("Title")]
    [MaxLength(100)]
    public string? Title { get; set; }

    [Column("MainParent")]
    public int? MainParentId { get; set; }

    [Column("ReportingHead")]
    [MaxLength(500)]
    public string? ReportingHead { get; set; }

    [Column("OrderBy")]
    public byte? DisplayOrder { get; set; }
}
