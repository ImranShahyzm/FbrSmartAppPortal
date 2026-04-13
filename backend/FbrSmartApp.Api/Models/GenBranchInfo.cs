using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models;

/// <summary>Maps to dbo.gen_BranchInfo (branches per company).</summary>
public sealed class GenBranchInfo
{
    [Key]
    [Column("BranchID")]
    public int Id { get; set; }

    [Column("EntryUserID")]
    public int? EntryUserId { get; set; }

    [Column("EntryUserDateTime")]
    public DateTime? EntryUserDateTime { get; set; }

    [Column("ModifyUserID")]
    public int? ModifyUserId { get; set; }

    [Column("ModifyUserDateTime")]
    public DateTime? ModifyUserDateTime { get; set; }

    [Column("CompanyID")]
    public int? CompanyId { get; set; }

    [Column("BranchName")]
    public string? BranchName { get; set; }

    [Column("BranchCode")]
    public string? BranchCode { get; set; }

    [Column("BranchNumber")]
    public string? BranchNumber { get; set; }

    [Column("BranchEmail")]
    public string? BranchEmail { get; set; }

    [Column("BranchAddress")]
    public string? BranchAddress { get; set; }

    [Column("BranchDescription")]
    public string? BranchDescription { get; set; }
}
