using FbrSmartApp.Api;

namespace FbrSmartApp.Api.Models;

/// <summary>FBR / sales invoice header (master).</summary>
[RecordRuleEntity("fbr", "fbrInvoices")]
public sealed class FbrInvoice
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public int CompanyId { get; set; }

    /// <summary>User / external reference (PO no., etc.). Nullable; separate from <see cref="InvoiceNumber"/>.</summary>
    public string? Reference { get; set; }

    /// <summary>System invoice number (INV#####) assigned at creation.</summary>
    public string? InvoiceNumber { get; set; }

    public int CustomerPartyId { get; set; }

    /// <summary>
    /// Invoice date (date-only, no timezone). Stored as SQL <c>DATE</c>.
    /// This is the business invoice date selected by the user and used for FBR payloads.
    /// </summary>
    public DateOnly InvoiceDate { get; set; }

    public DateTime InvoiceDateUtc { get; set; }

    public string PaymentTerms { get; set; } = "immediate";

    public string Status { get; set; } = "ordered";

    /// <summary>FBR-assigned invoice number after successful post (and sometimes returned on validate).</summary>
    public string? FbrInvoiceNumber { get; set; }

    public DateTime? ValidatedAtUtc { get; set; }
    public DateTime? PostedAtUtc { get; set; }

    /// <summary>When true, invoice cannot be edited or deleted (posted to FBR).</summary>
    public bool IsLocked { get; set; }

    public string? FbrLastResponseJson { get; set; }
    public string? FbrLastError { get; set; }

    public bool Returned { get; set; }

    public decimal DeliveryFees { get; set; }

    public decimal TotalExTaxes { get; set; }
    public decimal Taxes { get; set; }
    public decimal Total { get; set; }
    public decimal TaxRate { get; set; }

    /// <summary>FBR scenario master row — digital invoice scenarioId uses ScenarioCode.</summary>
    public int? FbrScenarioId { get; set; }

    /// <summary>Excel UniqueInvoiceID; blocks re-import of the same invoice for this company.</summary>
    public int? ExcelUniqueInvoiceId { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public string? CreatedByDisplayName { get; set; }
    public string? UpdatedByDisplayName { get; set; }

    public ICollection<FbrInvoiceLine> Lines { get; set; } = new List<FbrInvoiceLine>();
    public ICollection<FbrInvoiceChatterMessage> ChatterMessages { get; set; } =
        new List<FbrInvoiceChatterMessage>();
}
