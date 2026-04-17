using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models
{
    [Table("adgen_VehicleInfo")]
    public class VehicleInfo
    {
        [Key]
        public int VehicleID { get; set; }

        public int? EntryUserID { get; set; }

        public DateTime? EntryUserDateTime { get; set; }

        public int? ModifyUserID { get; set; }

        public DateTime? ModifyUserDateTime { get; set; }

        public int? CompanyID { get; set; }

        public int? VehicleGroupID { get; set; }

        [Required]
        public string VehicleTitle { get; set; }

        public string? VehicleCode { get; set; }

        // 🔗 Navigation Property (optional but recommended)
        [ForeignKey("VehicleGroupID")]
        public VehicleGroup? VehicleGroup { get; set; }
    }
}