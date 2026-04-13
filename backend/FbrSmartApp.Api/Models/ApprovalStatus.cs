using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models;

/// <summary>Shared lookup for document approval / workflow states (journal vouchers, future docs).</summary>
[Table("ApprovalStatuses")]
public sealed class ApprovalStatus
{
    public int Id { get; set; }

    [MaxLength(32)]
    public string Code { get; set; } = "";

    [MaxLength(100)]
    public string Name { get; set; } = "";

    public int SortOrder { get; set; }
}
