namespace FbrSmartApp.Api.Models;

public sealed class ProductProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Legacy ERP key. Generated in DB via sequence-backed default (not the PK in this app).
    /// </summary>
    public int ItemId { get; set; }

    public int CompanyId { get; set; }

    public string ProductNo { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string HsCode { get; set; } = "";

    public int? SaleTypeId { get; set; }
    public int? RateId { get; set; }
    public decimal? RateValue { get; set; }
    public decimal? PurchasePrice { get; set; }
    public int? SroId { get; set; }
    public int? SroItemId { get; set; }

    /// <summary>UI "Product Type" (purchase/sale/Services/none). FBR digital payload <c>saleType</c> uses <see cref="FbrPdiTransTypeId"/> description instead.</summary>
    public string? FbrProductType { get; set; }

    /// <summary>Optional free-text SRO schedule (e.g. SRO 2023/2501); used for FBR payload when set.</summary>
    public string? SroScheduleNoText { get; set; }

    /// <summary>Optional free-text SRO item reference (e.g. 45(i)); used for FBR payload when set.</summary>
    public string? SroItemRefText { get; set; }

    /// <summary>
    /// When true, FBR fixed notified value / retail price is applicable and sales tax should be computed on MRP.
    /// </summary>
    public bool FixedNotifiedApplicable { get; set; }

    /// <summary>MRP (fixed notified value / retail price) used for FBR tax base when <see cref="FixedNotifiedApplicable"/> is true.</summary>
    public decimal? MrpRateValue { get; set; }

    /// <summary>FBR PDI UOM id (uoM_ID) for digital invoice line UoM.</summary>
    public int? FbrUomId { get; set; }

    /// <summary>PDI transaction type (transactioN_TYPE_ID) — digital invoice saleType uses its Description.</summary>
    public int? FbrPdiTransTypeId { get; set; }

    /// <summary>Relative URL path under API host, e.g. uploads/productProfiles/1/{guid}/image.png</summary>
    public string? ProductImage { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<ProductProfileChatterMessage> ChatterMessages { get; set; } =
        new List<ProductProfileChatterMessage>();
}

