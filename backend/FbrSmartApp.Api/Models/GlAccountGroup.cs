using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FbrSmartApp.Api;

namespace FbrSmartApp.Api.Models;

[RecordRuleEntity("accounting", "glAccountGroups")]
public sealed class GlAccountGroup
{
    [Key]
    public int Id { get; set; }

    public int CompanyId { get; set; }

    [MaxLength(200)]
    public string GroupName { get; set; } = "";

    public long FromCode { get; set; }

    public long ToCode { get; set; }

    public int? ParentGroupId { get; set; }

    [ForeignKey(nameof(ParentGroupId))]
    public GlAccountGroup? ParentGroup { get; set; }

    [MaxLength(7)]
    public string ColorHex { get; set; } = "#000000";

    public DateTime CreatedAtUtc { get; set; }

    public DateTime UpdatedAtUtc { get; set; }
}
