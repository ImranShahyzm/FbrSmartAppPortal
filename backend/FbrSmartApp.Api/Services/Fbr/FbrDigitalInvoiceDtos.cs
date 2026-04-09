using System.Text.Json.Serialization;

namespace FbrSmartApp.Api.Services.Fbr;

/// <summary>Outbound JSON shape for FBR digital invoicing (matches legacy WeightBridge payload).</summary>
public sealed class FbrDigitalInvoicePayload
{
    [JsonPropertyName("invoiceType")]
    public string InvoiceType { get; set; } = "";

    [JsonPropertyName("invoiceDate")]
    public string InvoiceDate { get; set; } = "";

    [JsonPropertyName("sellerBusinessName")]
    public string SellerBusinessName { get; set; } = "";

    [JsonPropertyName("sellerProvince")]
    public string SellerProvince { get; set; } = "";

    [JsonPropertyName("sellerAddress")]
    public string SellerAddress { get; set; } = "";

    [JsonPropertyName("sellerNTNCNIC")]
    public string SellerNtncnic { get; set; } = "";

    [JsonPropertyName("buyerNTNCNIC")]
    public string BuyerNtncnic { get; set; } = "";

    [JsonPropertyName("buyerBusinessName")]
    public string BuyerBusinessName { get; set; } = "";

    [JsonPropertyName("buyerProvince")]
    public string BuyerProvince { get; set; } = "";

    [JsonPropertyName("buyerAddress")]
    public string BuyerAddress { get; set; } = "";

    [JsonPropertyName("invoiceRefNo")]
    public string InvoiceRefNo { get; set; } = "";

    [JsonPropertyName("buyerRegistrationType")]
    public string BuyerRegistrationType { get; set; } = "";

    [JsonPropertyName("scenarioId")]
    public string ScenarioId { get; set; } = "";

    [JsonPropertyName("items")]
    public List<FbrDigitalInvoiceLinePayload> Items { get; set; } = new();
}

public sealed class FbrDigitalInvoiceLinePayload
{
    [JsonPropertyName("hsCode")]
    public string HsCode { get; set; } = "";

    [JsonPropertyName("productDescription")]
    public string ProductDescription { get; set; } = "";

    [JsonPropertyName("rate")]
    public string Rate { get; set; } = "";

    [JsonPropertyName("uoM")]
    public string UoM { get; set; } = "";

    [JsonPropertyName("quantity")]
    public decimal Quantity { get; set; }

    [JsonPropertyName("totalValues")]
    public decimal TotalValues { get; set; }

    [JsonPropertyName("valueSalesExcludingST")]
    public string ValueSalesExcludingSt { get; set; } = "";

    [JsonPropertyName("salesTaxApplicable")]
    public string SalesTaxApplicable { get; set; } = "";

    [JsonPropertyName("fixedNotifiedValueOrRetailPrice")]
    public decimal FixedNotifiedValueOrRetailPrice { get; set; }

    [JsonPropertyName("salesTaxWithheldAtSource")]
    public decimal SalesTaxWithheldAtSource { get; set; }

    [JsonPropertyName("extraTax")]
    public string ExtraTax { get; set; } = "";

    [JsonPropertyName("furtherTax")]
    public decimal FurtherTax { get; set; }

    [JsonPropertyName("sroScheduleNo")]
    public string SroScheduleNo { get; set; } = "";

    [JsonPropertyName("fedPayable")]
    public decimal FedPayable { get; set; }

    [JsonPropertyName("discount")]
    public decimal Discount { get; set; }

    [JsonPropertyName("saleType")]
    public string SaleType { get; set; } = "";

    [JsonPropertyName("sroItemSerialNo")]
    public string SroItemSerialNo { get; set; } = "";
}

public sealed class FbrApiResponseDto
{
    [JsonPropertyName("invoiceNumber")]
    public string? InvoiceNumber { get; set; }

    [JsonPropertyName("dated")]
    public string? Dated { get; set; }

    [JsonPropertyName("validationResponse")]
    public FbrValidationResponseDto? ValidationResponse { get; set; }

    [JsonPropertyName("ErrorMessage")]
    public string? ErrorMessage { get; set; }
}

public sealed class FbrValidationResponseDto
{
    [JsonPropertyName("statusCode")]
    public string? StatusCode { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("errorCode")]
    public string? ErrorCode { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }

    [JsonPropertyName("invoiceStatuses")]
    public List<FbrInvoiceStatusDto>? InvoiceStatuses { get; set; }
}

public sealed class FbrInvoiceStatusDto
{
    [JsonPropertyName("itemSNo")]
    public string? ItemSNo { get; set; }

    [JsonPropertyName("statusCode")]
    public string? StatusCode { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("invoiceNo")]
    public string? InvoiceNo { get; set; }

    [JsonPropertyName("errorCode")]
    public string? ErrorCode { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}
