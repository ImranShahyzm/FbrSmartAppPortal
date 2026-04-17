using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models
{
    [Table("adgen_ColorInfo", Schema = "dbo")]
    public class ColorInfo
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int ColorID { get; set; }

        public int? EntryUserID { get; set; }

        public DateTime? EntryUserDateTime { get; set; }

        public int? ModifyUserID { get; set; }

        public DateTime? ModifyUserDateTime { get; set; }

        public int? CompanyID { get; set; }

        [MaxLength(50)]
        public string? ColorTitle { get; set; }
    }
}