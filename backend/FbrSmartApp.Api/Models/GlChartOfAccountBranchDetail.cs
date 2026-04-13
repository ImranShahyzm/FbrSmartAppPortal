using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models;

/// <summary>Maps to dbo.GLChartOfAccountBranchDetail (account available per branch).</summary>
public sealed class GlChartOfAccountBranchDetail
{
    [Key]
    [Column("GLCABranchDetailID")]
    public int Id { get; set; }

    [Column("GLCAID")]
    public int? GlcaId { get; set; }

    [Column("BranchID")]
    public int? BranchId { get; set; }
}
