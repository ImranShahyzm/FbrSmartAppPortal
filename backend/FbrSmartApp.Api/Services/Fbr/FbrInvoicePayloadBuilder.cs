using System.Globalization;
using FbrSmartApp.Api.Models;

namespace FbrSmartApp.Api.Services.Fbr;

public static class FbrInvoicePayloadBuilder
{
    private const string DefaultInvoiceType = "Sale Invoice";
    private const string NullToken = "NULL";
    private const string DefaultUom = "PCS";

    public static FbrDigitalInvoicePayload Build(
        FbrInvoice invoice,
        Company company,
        CustomerParty? customer,
        IReadOnlyList<FbrInvoiceLine> orderedLines,
        IReadOnlyDictionary<Guid, ProductProfile> profilesById,
        string scenarioCode,
        string? sellerProvinceName,
        string? buyerProvinceName,
        IReadOnlyDictionary<int, (string SerNo, string ItemDesc)> sroScheduleAndItemBySroItemId,
        IReadOnlyDictionary<int, string>? fbrUomDescriptionById,
        IReadOnlyDictionary<int, FbrSalesTaxRate> salesTaxRateById,
        IReadOnlyDictionary<int, string> pdiTransTypeDescriptionByTransTypeId
    )
    {
        var buyerNtn = NormalizeBuyerNtnCnic(customer?.NTNNO, customer?.SaleTaxRegNo);
        var buyerReg = customer?.FbrStatusActive == true ? "Registered" : "Unregistered";

        var payload = new FbrDigitalInvoicePayload
        {
            InvoiceType = DefaultInvoiceType,
            InvoiceDate = invoice.InvoiceDateUtc.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            SellerBusinessName = company.Title ?? "",
            SellerProvince = sellerProvinceName ?? "",
            SellerAddress = company.Address ?? "",
            SellerNtncnic = NormalizeNtn(company.NTNNo),
            BuyerNtncnic = buyerNtn,
            BuyerBusinessName = customer?.PartyBusinessName ?? customer?.PartyName ?? "",
            BuyerProvince = buyerProvinceName ?? "",
            BuyerAddress = (customer?.AddressOne ?? "").Trim(),
            // App "Reference" is internal only; never map FbrInvoice.Reference into FBR invoiceRefNo.
            InvoiceRefNo = "",
            BuyerRegistrationType = buyerReg,
            ScenarioId = scenarioCode.Trim(),
            Items = new List<FbrDigitalInvoiceLinePayload>(),
        };

        foreach (var line in orderedLines.OrderBy(x => x.SortOrder))
        {
            profilesById.TryGetValue(line.ProductProfileId, out var prof);
            var gross = line.Quantity * line.UnitPrice;
            var discPct = line.DiscountRate < 0 ? 0 : (line.DiscountRate > 100 ? 100 : line.DiscountRate);
            var net = gross * (1 - discPct / 100m);
            var taxMult = ResolveTaxMultiplier(line);
            var tax = net * taxMult;
            var lineTotal = net + tax;

            var saleType = ResolveSaleType(prof, pdiTransTypeDescriptionByTransTypeId);

            var uom = DefaultUom;
            if (prof?.FbrUomId is int uomId && uomId > 0)
            {
                if (fbrUomDescriptionById != null &&
                    fbrUomDescriptionById.TryGetValue(uomId, out var uomDesc) &&
                    !string.IsNullOrWhiteSpace(uomDesc))
                    uom = uomDesc.Trim();
                else
                    uom = uomId.ToString(CultureInfo.InvariantCulture);
            }

            var (sroSchedule, sroItemSerial) = ResolveSroPayload(prof, line, sroScheduleAndItemBySroItemId);

            var rateLabel = ResolveRateLabel(line, salesTaxRateById);

            var fixedNotified = prof?.RateValue ?? 0m;

            payload.Items.Add(new FbrDigitalInvoiceLinePayload
            {
                HsCode = string.IsNullOrWhiteSpace(line.HsCode) ? (prof?.HsCode ?? "") : line.HsCode,
                ProductDescription = prof?.ProductName ?? line.Remarks ?? "Item",
                Rate = rateLabel,
                UoM = uom,
                Quantity = line.Quantity,
                TotalValues = decimal.Round(lineTotal, 4, MidpointRounding.AwayFromZero),
                ValueSalesExcludingSt = net.ToString("0.######", CultureInfo.InvariantCulture),
                SalesTaxApplicable = tax.ToString("0.######", CultureInfo.InvariantCulture),
                FixedNotifiedValueOrRetailPrice = decimal.Round(fixedNotified, 4, MidpointRounding.AwayFromZero),
                SalesTaxWithheldAtSource = 0,
                ExtraTax = "",
                FurtherTax = 0,
                SroScheduleNo = sroSchedule,
                FedPayable = 0,
                Discount = 0,
                SaleType = saleType,
                SroItemSerialNo = sroItemSerial,
            });
        }

        return payload;
    }

    private static decimal ResolveTaxMultiplier(FbrInvoiceLine line) => line.TaxRate;

    private static string ResolveRateLabel(
        FbrInvoiceLine line,
        IReadOnlyDictionary<int, FbrSalesTaxRate> salesTaxRateById)
    {
        var labels = new List<string>();
        foreach (var id in FbrInvoiceLineTaxIds.Parse(line))
        {
            if (salesTaxRateById.TryGetValue(id, out var row) && !string.IsNullOrWhiteSpace(row.Label))
                labels.Add(row.Label.Trim());
        }

        if (labels.Count > 0)
            return string.Join(" + ", labels);

        var pct = line.TaxRate * 100m;
        if (pct <= 0) return "0%";
        return pct.ToString("0.######", CultureInfo.InvariantCulture).TrimEnd('0').TrimEnd('.') + "%";
    }

    /// <summary>
    /// FBR item <c>saleType</c> must come from <see cref="ProductProfile.FbrPdiTransTypeId"/> (UI: "Sale Type Fbr"):
    /// the synced PDI transaction type <i>description</i> for that id. <see cref="ProductProfile.FbrProductType"/> is not used here.
    /// </summary>
    private static string ResolveSaleType(
        ProductProfile? prof,
        IReadOnlyDictionary<int, string> pdiTransTypeDescriptionByTransTypeId)
    {
        if (prof?.FbrPdiTransTypeId is int ttId && ttId > 0 &&
            pdiTransTypeDescriptionByTransTypeId.TryGetValue(ttId, out var desc) &&
            !string.IsNullOrWhiteSpace(desc))
            return desc.Trim();
        return "Goods";
    }

    private static (string Schedule, string ItemSerial) ResolveSroPayload(
        ProductProfile? prof,
        FbrInvoiceLine line,
        IReadOnlyDictionary<int, (string SerNo, string ItemDesc)> sroScheduleAndItemBySroItemId)
    {
        var schedFree = prof?.SroScheduleNoText?.Trim();
        var itemFree = prof?.SroItemRefText?.Trim();
        if (!string.IsNullOrEmpty(schedFree) || !string.IsNullOrEmpty(itemFree))
        {
            var sched = string.IsNullOrWhiteSpace(schedFree) ? NullToken : schedFree;
            var serial = string.IsNullOrWhiteSpace(itemFree) ? NullToken : itemFree;
            return (sched, serial);
        }

        if (prof?.SroItemId is int sroItemId && sroItemId > 0 &&
            sroScheduleAndItemBySroItemId.TryGetValue(sroItemId, out var sroMeta))
        {
            var sched = string.IsNullOrWhiteSpace(sroMeta.SerNo) ? NullToken : sroMeta.SerNo.Trim();
            var serial = string.IsNullOrWhiteSpace(sroMeta.ItemDesc) ? NullToken : sroMeta.ItemDesc.Trim();
            return (sched, serial);
        }

        return (NullToken, NullToken);
    }

    private static string NormalizeNtn(string? ntn)
    {
        if (string.IsNullOrWhiteSpace(ntn)) return "";
        var t = ntn.Trim();
        var idx = t.IndexOf('-');
        return idx > 0 ? t[..idx].Trim() : t;
    }

    private static string NormalizeBuyerNtnCnic(string? ntn, string? strn)
    {
        if (!string.IsNullOrWhiteSpace(ntn))
            return NormalizeNtn(ntn);
        if (!string.IsNullOrWhiteSpace(strn))
            return strn.Trim();
        return "";
    }
}
