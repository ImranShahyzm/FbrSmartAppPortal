namespace FbrSmartApp.Api.Models;

/// <summary>Company sales tax / FBR line rate: label (exact JSON rate), percentage for math, effective dating.</summary>
public sealed class FbrSalesTaxRate
{
    public int Id { get; set; }

    public int CompanyId { get; set; }

    /// <summary>Exact FBR payload value, e.g. 18%, Exempt.</summary>
    public string Label { get; set; } = "";

    /// <summary>Decimal multiplier for tax, e.g. 0.18; 0 for exempt.</summary>
    public decimal Percentage { get; set; }

    public DateOnly EffectiveFrom { get; set; }

    public DateOnly? EffectiveTo { get; set; }

    /// <summary>group_of_taxes | fixed | percentage | percentage_tax_included</summary>
    public string TaxComputation { get; set; } = "percentage";

    public bool IsActive { get; set; } = true;

    /// <summary>sales | purchase | none</summary>
    public string TaxType { get; set; } = "sales";

    /// <summary>services | goods, or null.</summary>
    public string? TaxScope { get; set; }

    public string? LabelOnInvoices { get; set; }

    public string? Description { get; set; }

    public string? TaxGroup { get; set; }

    public bool IncludeInAnalyticCost { get; set; }

    public string? Country { get; set; }

    public string? LegalNotes { get; set; }

    /// <summary>e.g. default | yes | no (Odoo-style).</summary>
    public string? IncludedInPrice { get; set; }

    public bool AffectBaseOfSubsequentTaxes { get; set; }

    public ICollection<FbrSalesTaxRateChatterMessage> ChatterMessages { get; set; } =
        new List<FbrSalesTaxRateChatterMessage>();
}
