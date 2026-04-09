using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models;

// Maps to dbo.Fbr_ProvinceData
public sealed class FbrProvinceData
{
    // react-admin needs `id`
    [Column("ProvinceID")]
    public int Id { get; set; }

    public string? Provincename { get; set; }
    public int? CompanyID { get; set; }
}

