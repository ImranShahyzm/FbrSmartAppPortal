namespace FbrSmartApp.Api.Models;

/// <summary>Invoice line (detail) — product from ProductProfiles, HS/SRO snapshotted on save.</summary>
public sealed class FbrInvoiceLine
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid InvoiceId { get; set; }
    public FbrInvoice? Invoice { get; set; }

    public int SortOrder { get; set; }

    public Guid ProductProfileId { get; set; }

    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TaxRate { get; set; }

    /// <summary>FK to FbrSalesTaxRates — FBR payload rate uses master Label; TaxRate mirrors Percentage.</summary>
    public int? FbrSalesTaxRateId { get; set; }

    /// <summary>When multiple taxes apply, JSON array of FbrSalesTaxRates ids (additive percentages in <see cref="TaxRate"/>).</summary>
    public string? FbrSalesTaxRateIdsJson { get; set; }
    /// <summary>Discount percent (0-100) captured on the line.</summary>
    public decimal DiscountRate { get; set; }

    /// <summary>Snapshot from ProductProfile.HsCode at save time.</summary>
    public string HsCode { get; set; } = "";

    /// <summary>Snapshot: SRO schedule + item text for FBR context.</summary>
    public string SroItemText { get; set; } = "";

    public string Remarks { get; set; } = "";
}
