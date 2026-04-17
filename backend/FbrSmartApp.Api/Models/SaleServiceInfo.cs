using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace FbrSmartApp.Api.Models;

[Table("adgen_SaleServiceInfo")]
public class SaleServiceInfo
{
    [Key]
    public int SaleServiceInfoID { get; set; }

    public string? EntryUserID { get; set; }
    public DateTime? EntryUserDateTime { get; set; }

    public string? ModifyUserID { get; set; }
    public DateTime? ModifyUserDateTime { get; set; }

    public int? CompanyID { get; set; }
    public string? Name { get; set; }

    [JsonPropertyName("glcaId")]
    public int? GLCAID { get; set; }

    public string? Description { get; set; }

    public bool ChargeToCompany { get; set; }
    public int? VehicleGroupId { get; set; }
}
