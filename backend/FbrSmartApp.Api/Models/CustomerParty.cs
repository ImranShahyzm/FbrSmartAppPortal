using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models;

// Minimal fields from dbo.gen_PartiesInfo (multi-tenant)
public sealed class CustomerParty
{
    [Column("PartyID")]
    public int Id { get; set; }

    public int? CompanyID { get; set; }

    public string? PartyName { get; set; }
    public string? PartyBusinessName { get; set; }

    public string? AddressOne { get; set; }
    public string? PhoneOne { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactPersonMobile { get; set; }

    public string? Email { get; set; }
    public string? NTNNO { get; set; }
    public string? SaleTaxRegNo { get; set; }

    // FBR status drives buyer registration type for digital invoicing.
    public bool FbrStatusActive { get; set; } = true;

    // Province for FBR
    public int? ProvinceID { get; set; }

    // Stored relative path under /uploads/parties/{companyId}/{id}/logo.ext
    public string? PartyBusinessLogo { get; set; }
}

