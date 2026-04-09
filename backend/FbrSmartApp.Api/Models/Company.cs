using System.ComponentModel.DataAnnotations.Schema;

namespace FbrSmartApp.Api.Models;

// Maps to dbo.GLCompany (existing schema + FBR fields)
public sealed class Company
{
    // React-Admin requires an "id" field
    [Column("Companyid")]
    public int Id { get; set; }

    public string Title { get; set; } = "";
    public string ShortTitle { get; set; } = "";

    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? website { get; set; }
    public string? NTNNo { get; set; }

    public string? Terms_Condition_1 { get; set; }
    public string? Terms_Condition_2 { get; set; }
    public string? Terms_Condition_3 { get; set; }

    public string? St_Registration { get; set; }
    public string? CompanyImage { get; set; }
    public bool Inactive { get; set; }

    public string? SaleEmail { get; set; }
    public int? MainCompanyID { get; set; }
    public string? PostalCode { get; set; }
    public string? PoBoxNo { get; set; }
    public string? FaxNo { get; set; }

    // New fields for FBR integration
    public string? FbrTokenSandBox { get; set; }
    public string? FbrTokenProduction { get; set; }
    public bool EnableSandBox { get; set; }

    public int? FbrProvinceId { get; set; }

    /// <summary>When false, tenant is pending approval (self-service registration).</summary>
    public bool IsActivated { get; set; } = true;

    public int? EmployeeCount { get; set; }
}

