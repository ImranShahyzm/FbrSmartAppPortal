using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models
{
    [Table("adgen_VehicleGroup")]
    public class VehicleGroup
    {
        [Key]
        public int VehicleGroupID { get; set; }

        public int? EntryUserID { get; set; }

        public DateTime? EntryUserDateTime { get; set; }

        public int? ModifyUserID { get; set; }

        public DateTime? ModifyUserDateTime { get; set; }

        public int? CompanyID { get; set; }

        [Required]
        public string VehicleGroupTitle { get; set; }
    }
}