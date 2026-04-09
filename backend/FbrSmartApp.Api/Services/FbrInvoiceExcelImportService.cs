using System.Globalization;
using ClosedXML.Excel;
using FbrSmartApp.Api.Controllers;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using FbrSmartApp.Api.Services.Fbr;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Services;

public interface IFbrInvoiceExcelImportService
{
    byte[] BuildTemplateWorkbook();
    Task<FbrInvoiceExcelImportParseResult> ParseWorkbookAsync(
        int companyId,
        Company company,
        Stream xlsxStream,
        CancellationToken ct);
}

/// <summary>One grouped invoice from the sheet: either ready to persist or a parse error.</summary>
public sealed class FbrInvoiceExcelImportGroup
{
    public string GroupKey { get; init; } = "";
    public int FirstExcelRowNumber { get; init; }
    public FbrInvoicesController.UpsertFbrInvoiceRequest? Request { get; init; }
    public string? ParseError { get; init; }
}

public sealed class FbrInvoiceExcelImportParseResult
{
    public bool Success { get; init; }
    public string? GlobalError { get; init; }
    public IReadOnlyList<FbrInvoiceExcelImportGroup> Groups { get; init; } = Array.Empty<FbrInvoiceExcelImportGroup>();
}

public sealed class FbrInvoiceExcelImportService(AppDbContext db) : IFbrInvoiceExcelImportService
{
    /// <summary>Applied to product profiles auto-created from Excel so FBR validate/post prereqs (PDI type) are met.</summary>
    private readonly record struct ExcelImportProductDefaults(int? FbrPdiTransTypeId, int? FbrUomId);

    /// <summary>Canonical headers (WeightBridge TVP / FBR sample) + ProductNo for reliable product match.</summary>
    public static readonly string[] TemplateHeaders =
    [
        "UniqueInvoiceID",
        "InvoiceType",
        "InvoiceDate",
        "SellerBusinessName",
        "SellerProvince",
        "SellerAddress",
        "SellerNTNCNIC",
        "BuyerNTNCNIC",
        "BuyerBusinessName",
        "BuyerProvince",
        "BuyerAddress",
        "InvoiceRefNo",
        "BuyerRegistrationType",
        "ScenarioId",
        "HsCode",
        "ProductDescription",
        "ProductNo",
        "Rate",
        "UoM",
        "Quantity",
        "TotalValues",
        "ValueSalesExcludingST",
        "SalesTaxApplicable",
        "FixedNotifiedValueOrRetailPrice",
        "SalesTaxWithheldAtSource",
        "ExtraTax",
        "FurtherTax",
        "SroScheduleNo",
        "FedPayable",
        "Discount",
        "SaleType",
        "SroItemSerialNo",
    ];

    private static readonly Dictionary<string, string> HeaderAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["uniqueinvoiceid"] = "UniqueInvoiceID",
        ["invoicetype"] = "InvoiceType",
        ["invoicedate"] = "InvoiceDate",
        ["sellerbusinessname"] = "SellerBusinessName",
        ["sellerprovince"] = "SellerProvince",
        ["selleraddress"] = "SellerAddress",
        ["sellerntncnic"] = "SellerNTNCNIC",
        ["buyerntncnic"] = "BuyerNTNCNIC",
        ["buyerbusinessname"] = "BuyerBusinessName",
        ["buyerprovince"] = "BuyerProvince",
        ["buyeraddress"] = "BuyerAddress",
        ["invoicerefno"] = "InvoiceRefNo",
        ["invoiceref"] = "InvoiceRefNo",
        ["buyerregistrationtype"] = "BuyerRegistrationType",
        ["scenarioid"] = "ScenarioId",
        ["hscode"] = "HsCode",
        ["productdescription"] = "ProductDescription",
        ["productno"] = "ProductNo",
        ["productnumber"] = "ProductNo",
        ["rate"] = "Rate",
        ["uom"] = "UoM",
        ["quantity"] = "Quantity",
        ["totalvalues"] = "TotalValues",
        ["valuesalesexcludingst"] = "ValueSalesExcludingST",
        ["salestaxapplicable"] = "SalesTaxApplicable",
        ["fixednotifiedvalueorretailprice"] = "FixedNotifiedValueOrRetailPrice",
        ["salestaxwithheldatsource"] = "SalesTaxWithheldAtSource",
        ["extratax"] = "ExtraTax",
        ["furthertax"] = "FurtherTax",
        ["sroscheduleno"] = "SroScheduleNo",
        ["fedpayable"] = "FedPayable",
        ["discount"] = "Discount",
        ["saletype"] = "SaleType",
        ["sroitemserialno"] = "SroItemSerialNo",
    };

    public byte[] BuildTemplateWorkbook()
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Invoices");
        for (var i = 0; i < TemplateHeaders.Length; i++)
            ws.Cell(1, i + 1).Value = TemplateHeaders[i];
        ws.Row(1).Style.Font.Bold = true;

        ws.Cell(2, 1).Value = 1;
        ws.Cell(2, 3).Value = DateTime.UtcNow.Date;
        ws.Cell(2, 7).Value = "SELLER_NTN";
        ws.Cell(2, 8).Value = "BUYER_NTN";
        ws.Cell(2, 12).Value = "REF-001";
        ws.Cell(2, 14).Value = "SN001";
        ws.Cell(2, 15).Value = "HS1234";
        ws.Cell(2, 16).Value = "Sample product";
        ws.Cell(2, 17).Value = "SKU-001";
        ws.Cell(2, 18).Value = "18%";
        ws.Cell(2, 20).Value = 1;
        ws.Cell(2, 21).Value = 1000;
        ws.Cell(2, 22).Value = 847.46;

        var readme = wb.AddWorksheet("ReadMe");
        readme.Cell(1, 1).Value =
            "One row = one invoice line. Same UniqueInvoiceID (or same InvoiceRefNo) groups lines into one invoice.";
        readme.Cell(2, 1).Value =
            "SellerNTNCNIC in the file is ignored; the importer uses your company NTN. BuyerNTNCNIC: existing buyer (same NTN/CNIC for this company) is reused; otherwise a customer is created.";
        readme.Cell(3, 1).Value =
            "Products: existing HsCode (or ProductNo) is used; otherwise a product profile is created. Multiple rows sharing the same HsCode need ProductNo if more than one product exists.";
        readme.Cell(4, 1).Value =
            "ScenarioId: if the code is missing for this company, it is created (description: Imported from Excel).";
        readme.Cell(5, 1).Value =
            "Rate: label (e.g. 18%) or numeric percent; unknown rates are created automatically. Re-import same UniqueInvoiceID or InvoiceRefNo is rejected.";

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    public async Task<FbrInvoiceExcelImportParseResult> ParseWorkbookAsync(
        int companyId,
        Company company,
        Stream xlsxStream,
        CancellationToken ct)
    {
        List<FbrInvoiceExcelImportGroup> groups;
        try
        {
            using var wb = new XLWorkbook(xlsxStream);
            var ws = wb.Worksheets.FirstOrDefault();
            if (ws is null)
                return new FbrInvoiceExcelImportParseResult { Success = false, GlobalError = "Workbook has no sheets." };

            var headerRow = ws.FirstRowUsed();
            var lastRowUsed = ws.LastRowUsed();
            if (headerRow is null || lastRowUsed is null)
                return new FbrInvoiceExcelImportParseResult { Success = false, GlobalError = "Sheet is empty." };

            var headerRowNum = headerRow.RowNumber();
            var lastRowNum = lastRowUsed.RowNumber();
            if (lastRowNum <= headerRowNum)
                return new FbrInvoiceExcelImportParseResult { Success = false, GlobalError = "No data rows after header." };

            var headerMap = BuildHeaderMap(ws.Row(headerRowNum));
            if (headerMap.Count == 0)
                return new FbrInvoiceExcelImportParseResult { Success = false, GlobalError = "Could not read header row." };

            var dataRows = new List<(int RowNumber, Dictionary<string, string> Cells)>();
            for (var r = headerRowNum + 1; r <= lastRowNum; r++)
            {
                var cells = ReadRowAsMap(ws.Row(r), headerMap);
                if (cells.Values.All(string.IsNullOrWhiteSpace))
                    continue;
                dataRows.Add((r, cells));
            }

            if (dataRows.Count == 0)
                return new FbrInvoiceExcelImportParseResult { Success = false, GlobalError = "No non-empty data rows." };

            var companyNtnNorm = NormalizeNtn(company.NTNNo);
            if (string.IsNullOrEmpty(companyNtnNorm))
            {
                return new FbrInvoiceExcelImportParseResult
                {
                    Success = false,
                    GlobalError = "Company NTN is not configured; set it in company settings before import.",
                };
            }

            var grouped = dataRows
                .GroupBy(t => BuildGroupKey(t.Cells, t.RowNumber))
                .ToList();

            var productIndex = await BuildProductLookupAsync(companyId, ct);
            // Only parties with NTN/CNIC can match BuyerNTNCNIC — avoids missing duplicates among large party lists.
            var customerRows = await db.Customers.AsNoTracking()
                .Where(x =>
                    (x.CompanyID == null || x.CompanyID == companyId) &&
                    (x.NTNNO != null || x.SaleTaxRegNo != null))
                .ToListAsync(ct);
            var createdBuyerKeyToId = new Dictionary<string, int>(StringComparer.Ordinal);
            var scenarioCache = await db.FbrScenarios.AsNoTracking()
                .Where(x => x.CompanyId == companyId)
                .ToListAsync(ct);
            var importProductDefaults = await ResolveExcelImportProductDefaultsAsync(companyId, ct);

            groups = [];
            foreach (var g in grouped.OrderBy(x => x.Min(t => t.RowNumber)))
            {
                var first = g.OrderBy(t => t.RowNumber).First();
                var key = g.Key;
                StampSellerNtnOnGroup(g, company.NTNNo);

                if (!TryParseInvoiceDate(first.Cells, out var invDateUtc, out var dateErr))
                {
                    groups.Add(new FbrInvoiceExcelImportGroup
                    {
                        GroupKey = key,
                        FirstExcelRowNumber = first.RowNumber,
                        ParseError = dateErr,
                    });
                    continue;
                }

                var buyerNtn = GetCell(first.Cells, "BuyerNTNCNIC");
                var (customerId, custErr) = await EnsureCustomerPartyIdAsync(
                    companyId,
                    buyerNtn,
                    first.Cells,
                    customerRows,
                    createdBuyerKeyToId,
                    ct);
                if (custErr is not null)
                {
                    groups.Add(new FbrInvoiceExcelImportGroup
                    {
                        GroupKey = key,
                        FirstExcelRowNumber = first.RowNumber,
                        ParseError = custErr,
                    });
                    continue;
                }

                var scenarioCodeRaw = GetCell(first.Cells, "ScenarioId").Trim();
                if (string.IsNullOrEmpty(scenarioCodeRaw))
                {
                    groups.Add(new FbrInvoiceExcelImportGroup
                    {
                        GroupKey = key,
                        FirstExcelRowNumber = first.RowNumber,
                        ParseError = "ScenarioId is required when lines are present.",
                    });
                    continue;
                }

                var (scenario, scenErr) = await EnsureFbrScenarioAsync(
                    companyId,
                    scenarioCodeRaw,
                    scenarioCache,
                    ct);
                if (scenErr is not null || scenario is null)
                {
                    groups.Add(new FbrInvoiceExcelImportGroup
                    {
                        GroupKey = key,
                        FirstExcelRowNumber = first.RowNumber,
                        ParseError = scenErr ?? "Scenario could not be resolved.",
                    });
                    continue;
                }

                var uidRaw = GetCell(first.Cells, "UniqueInvoiceID");
                int? excelUid = int.TryParse(uidRaw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var uidParsed) &&
                                uidParsed != 0
                    ? uidParsed
                    : null;
                if (excelUid is not null &&
                    await db.FbrInvoices.AsNoTracking()
                        .AnyAsync(x => x.CompanyId == companyId && x.ExcelUniqueInvoiceId == excelUid, ct))
                {
                    groups.Add(new FbrInvoiceExcelImportGroup
                    {
                        GroupKey = key,
                        FirstExcelRowNumber = first.RowNumber,
                        ParseError = $"UniqueInvoiceID {excelUid.Value} was already imported.",
                    });
                    continue;
                }

                var refNo = GetCell(first.Cells, "InvoiceRefNo").Trim();
                if (!string.IsNullOrEmpty(refNo) &&
                    await db.FbrInvoices.AsNoTracking()
                        .AnyAsync(x => x.CompanyId == companyId && x.Reference == refNo, ct))
                {
                    groups.Add(new FbrInvoiceExcelImportGroup
                    {
                        GroupKey = key,
                        FirstExcelRowNumber = first.RowNumber,
                        ParseError = $"InvoiceRefNo \"{refNo}\" already exists.",
                    });
                    continue;
                }

                var asOf = FbrSalesTaxRateExtensions.ToDateOnlyUtc(invDateUtc);
                var taxRates = await db.FbrSalesTaxRates.AsNoTracking()
                    .Where(x =>
                        x.CompanyId == companyId &&
                        x.EffectiveFrom <= asOf &&
                        (x.EffectiveTo == null || x.EffectiveTo >= asOf))
                    .ToListAsync(ct);

                var lines = new List<FbrInvoicesController.UpsertFbrInvoiceLineRequest>();
                var lineErrors = new List<string>();
                foreach (var (rowNum, cells) in g.OrderBy(x => x.RowNumber))
                {
                    var (ok, line, lineErr) = await TryBuildLineAsync(
                        cells,
                        productIndex,
                        taxRates,
                        asOf,
                        rowNum,
                        companyId,
                        importProductDefaults,
                        ct);
                    if (!ok)
                        lineErrors.Add(lineErr ?? $"Row {rowNum}: invalid line.");
                    else
                        lines.Add(line!);
                }

                if (lineErrors.Count > 0)
                {
                    groups.Add(new FbrInvoiceExcelImportGroup
                    {
                        GroupKey = key,
                        FirstExcelRowNumber = first.RowNumber,
                        ParseError = string.Join(" ", lineErrors),
                    });
                    continue;
                }

                if (lines.Count == 0)
                {
                    groups.Add(new FbrInvoiceExcelImportGroup
                    {
                        GroupKey = key,
                        FirstExcelRowNumber = first.RowNumber,
                        ParseError = "Invoice has no valid lines.",
                    });
                    continue;
                }

                groups.Add(new FbrInvoiceExcelImportGroup
                {
                    GroupKey = key,
                    FirstExcelRowNumber = first.RowNumber,
                    Request = new FbrInvoicesController.UpsertFbrInvoiceRequest
                    {
                        Reference = string.IsNullOrWhiteSpace(refNo) ? null : refNo,
                        CustomerPartyId = customerId,
                        InvoiceDateUtc = invDateUtc,
                        PaymentTerms = "immediate",
                        Status = "ordered",
                        Returned = false,
                        DeliveryFees = 0,
                        FbrScenarioId = scenario.Id,
                        StrictImportDuplicateCheck = true,
                        ExcelUniqueInvoiceId = excelUid,
                        Lines = lines,
                    },
                });
            }
        }
        catch (Exception ex)
        {
            return new FbrInvoiceExcelImportParseResult
            {
                Success = false,
                GlobalError = "Could not read Excel file: " + ex.Message,
            };
        }

        return new FbrInvoiceExcelImportParseResult { Success = true, Groups = groups };
    }

    private static Dictionary<string, int> BuildHeaderMap(IXLRow headerRow)
    {
        var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var cell in headerRow.CellsUsed())
        {
            var raw = cell.GetString().Trim();
            if (string.IsNullOrEmpty(raw)) continue;
            var norm = NormalizeHeaderKey(raw);
            if (!HeaderAliases.TryGetValue(norm, out var canonical))
                canonical = raw;
            map[canonical] = cell.Address.ColumnNumber;
        }

        return map;
    }

    private static string NormalizeHeaderKey(string s) =>
        new string(s.Where(c => !char.IsWhiteSpace(c)).ToArray()).ToLowerInvariant();

    private static Dictionary<string, string> ReadRowAsMap(IXLRow row, Dictionary<string, int> headerMap)
    {
        var d = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var (name, col) in headerMap)
        {
            var v = row.Cell(col).GetFormattedString()?.Trim() ?? "";
            d[name] = v;
        }

        return d;
    }

    private static string GetCell(Dictionary<string, string> cells, string name) =>
        cells.TryGetValue(name, out var v) ? v : "";

    private static string BuildGroupKey(Dictionary<string, string> cells, int rowNumber)
    {
        var uid = GetCell(cells, "UniqueInvoiceID");
        if (int.TryParse(uid, NumberStyles.Integer, CultureInfo.InvariantCulture, out var id) && id != 0)
            return "u:" + id;

        var r = GetCell(cells, "InvoiceRefNo").Trim();
        if (!string.IsNullOrEmpty(r))
            return "r:" + r;

        return "row:" + rowNumber;
    }

    private static void StampSellerNtnOnGroup(
        IGrouping<string, (int RowNumber, Dictionary<string, string> Cells)> group,
        string? companyNtnRaw)
    {
        var v = string.IsNullOrWhiteSpace(companyNtnRaw) ? "" : companyNtnRaw.Trim();
        foreach (var (_, cells) in group)
            cells["SellerNTNCNIC"] = v;
    }

    private static bool TryParseInvoiceDate(Dictionary<string, string> cells, out DateTime invoiceDateUtc, out string? error)
    {
        error = null;
        invoiceDateUtc = default;
        var raw = GetCell(cells, "InvoiceDate");
        if (string.IsNullOrWhiteSpace(raw))
        {
            invoiceDateUtc = DateTime.UtcNow.Date;
            return true;
        }

        if (DateTime.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var dt))
        {
            invoiceDateUtc = DateTime.SpecifyKind(dt.Date, DateTimeKind.Utc);
            return true;
        }

        if (double.TryParse(raw, NumberStyles.Float, CultureInfo.InvariantCulture, out var oa))
        {
            try
            {
                invoiceDateUtc = DateTime.SpecifyKind(DateTime.FromOADate(oa).Date, DateTimeKind.Utc);
                return true;
            }
            catch
            {
                /* fall through */
            }
        }

        error = $"Invalid InvoiceDate \"{raw}\".";
        return false;
    }

    /// <summary>Prefer a customer belonging to this company; otherwise shared (CompanyID null) rows.</summary>
    private static int? ResolveCustomerPartyId(List<CustomerParty> customers, string buyerRaw, int companyId)
    {
        var trimmed = buyerRaw.Trim();
        if (string.IsNullOrEmpty(trimmed)) return null;

        var forCompany = customers.Where(c => c.CompanyID == companyId).ToList();
        var id = MatchBuyerToCustomerList(forCompany, trimmed);
        if (id != null) return id;

        var shared = customers.Where(c => c.CompanyID == null).ToList();
        return MatchBuyerToCustomerList(shared, trimmed);
    }

    private static int? MatchBuyerToCustomerList(IReadOnlyList<CustomerParty> list, string trimmed)
    {
        var wantDigits = DigitsOnly(trimmed);
        var wantNtn = NormalizeNtn(trimmed);

        foreach (var c in list)
        {
            var strn = c.SaleTaxRegNo?.Trim();
            if (!string.IsNullOrEmpty(strn) &&
                string.Equals(strn, trimmed, StringComparison.OrdinalIgnoreCase))
                return c.Id;

            var strnDig = DigitsOnly(strn);
            if (wantDigits.Length > 0 && strnDig.Length > 0 &&
                string.Equals(wantDigits, strnDig, StringComparison.Ordinal))
                return c.Id;

            var n = NormalizeNtn(c.NTNNO);
            if (!string.IsNullOrEmpty(n) && !string.IsNullOrEmpty(wantNtn) &&
                string.Equals(n, wantNtn, StringComparison.OrdinalIgnoreCase))
                return c.Id;

            var ntnDig = DigitsOnly(c.NTNNO);
            if (wantDigits.Length > 0 && ntnDig.Length > 0 &&
                string.Equals(wantDigits, ntnDig, StringComparison.Ordinal))
                return c.Id;
        }

        return null;
    }

    private static string BuyerCacheKey(string buyerRaw)
    {
        var d = DigitsOnly(buyerRaw);
        if (d.Length >= 13)
            return "id:" + d;
        return "ntn:" + NormalizeNtn(buyerRaw).ToLowerInvariant();
    }

    private static CustomerParty BuildNewCustomerFromRow(int companyId, string trimmed, Dictionary<string, string> cells)
    {
        var bus = TruncateStr(GetCell(cells, "BuyerBusinessName"), 350);
        var digits = DigitsOnly(trimmed);
        var looksCnic = digits.Length == 13;
        var display = string.IsNullOrWhiteSpace(bus) ? "Customer " + trimmed : bus.Trim();
        var partyName = TruncateStr(display, 100);
        var partyBus = string.IsNullOrWhiteSpace(bus) ? partyName : TruncateStr(bus.Trim(), 350);
        var ntnNorm = NormalizeNtn(trimmed);
        var ntnStored = string.IsNullOrEmpty(ntnNorm) ? trimmed : ntnNorm;

        return new CustomerParty
        {
            CompanyID = companyId,
            PartyName = partyName,
            PartyBusinessName = partyBus,
            AddressOne = TruncateStr(GetCell(cells, "BuyerAddress"), 300),
            NTNNO = looksCnic ? null : TruncateStr(ntnStored, 30),
            SaleTaxRegNo = looksCnic ? TruncateStr(digits, 30) : null,
        };
    }

    private async Task<(int Id, string? Error)> EnsureCustomerPartyIdAsync(
        int companyId,
        string buyerRaw,
        Dictionary<string, string> cells,
        List<CustomerParty> customerRows,
        Dictionary<string, int> createdByBuyerKey,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(buyerRaw))
            return (0, "BuyerNTNCNIC is required.");

        var key = BuyerCacheKey(buyerRaw);
        if (createdByBuyerKey.TryGetValue(key, out var cached))
            return (cached, null);

        var existing = ResolveCustomerPartyId(customerRows, buyerRaw, companyId);
        if (existing is int found)
        {
            createdByBuyerKey[key] = found;
            return (found, null);
        }

        var entity = BuildNewCustomerFromRow(companyId, buyerRaw.Trim(), cells);
        db.Customers.Add(entity);
        await db.SaveChangesAsync(ct);
        customerRows.Add(entity);
        createdByBuyerKey[key] = entity.Id;
        return (entity.Id, null);
    }

    private async Task<(FbrScenario? Scenario, string? Error)> EnsureFbrScenarioAsync(
        int companyId,
        string scenarioCodeRaw,
        List<FbrScenario> cache,
        CancellationToken ct)
    {
        var scenarioCode = TruncateStr(scenarioCodeRaw.Trim(), 20);
        if (string.IsNullOrEmpty(scenarioCode))
            return (null, "ScenarioId is required when lines are present.");

        var found = cache.FirstOrDefault(x =>
            string.Equals(x.ScenarioCode.Trim(), scenarioCode, StringComparison.OrdinalIgnoreCase));
        if (found != null)
            return (found, null);

        var entity = new FbrScenario
        {
            CompanyId = companyId,
            ScenarioCode = scenarioCode,
            Description = TruncateStr($"Imported from Excel - {scenarioCode}", 500),
            FbrPdiTransTypeId = null,
        };
        db.FbrScenarios.Add(entity);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            var existing = await db.FbrScenarios.AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.CompanyId == companyId && x.ScenarioCode == scenarioCode,
                    ct);
            if (existing is null)
            {
                var all = await db.FbrScenarios.AsNoTracking()
                    .Where(x => x.CompanyId == companyId)
                    .ToListAsync(ct);
                existing = all.FirstOrDefault(x =>
                    string.Equals(x.ScenarioCode.Trim(), scenarioCode, StringComparison.OrdinalIgnoreCase));
            }

            if (existing != null)
            {
                if (cache.All(c => c.Id != existing.Id))
                    cache.Add(existing);
                return (existing, null);
            }

            return (null, $"Could not create scenario \"{scenarioCode}\".");
        }

        cache.Add(entity);
        return (entity, null);
    }

    private static string DigitsOnly(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return "";
        return new string(s.Where(char.IsDigit).ToArray());
    }

    private static string TruncateStr(string? value, int maxLen)
    {
        if (string.IsNullOrEmpty(value)) return "";
        var t = value.Trim();
        return t.Length <= maxLen ? t : t[..maxLen];
    }

    private static string NormalizeNtn(string? ntn)
    {
        if (string.IsNullOrWhiteSpace(ntn)) return "";
        var t = ntn.Trim();
        var idx = t.IndexOf('-');
        return idx > 0 ? t[..idx].Trim() : t;
    }

    private sealed class ProductLookup
    {
        public Dictionary<string, Guid> ByProductNo { get; } = new(StringComparer.OrdinalIgnoreCase);
        public Dictionary<string, List<Guid>> ByHsCode { get; } = new(StringComparer.OrdinalIgnoreCase);
    }

    private async Task<ProductLookup> BuildProductLookupAsync(int companyId, CancellationToken ct)
    {
        var profiles = await db.ProductProfiles.AsNoTracking()
            .Where(x => x.CompanyId == companyId)
            .Select(x => new { x.Id, x.ProductNo, x.HsCode })
            .ToListAsync(ct);
        var pl = new ProductLookup();
        foreach (var p in profiles)
        {
            var no = p.ProductNo?.Trim();
            if (!string.IsNullOrEmpty(no))
                pl.ByProductNo[no] = p.Id;
            var hs = p.HsCode?.Trim();
            if (string.IsNullOrEmpty(hs)) continue;
            if (!pl.ByHsCode.TryGetValue(hs, out var list))
            {
                list = [];
                pl.ByHsCode[hs] = list;
            }

            list.Add(p.Id);
        }

        return pl;
    }

    private async Task<ExcelImportProductDefaults> ResolveExcelImportProductDefaultsAsync(
        int companyId,
        CancellationToken ct)
    {
        var pdiRows = await db.FbrPdiTransTypes.AsNoTracking()
            .Where(x => x.CompanyId == companyId)
            .OrderBy(x => x.TransTypeId)
            .ToListAsync(ct);
        int? pdiId = null;
        if (pdiRows.Count > 0)
        {
            var goods = pdiRows.FirstOrDefault(x =>
                x.Description.Contains("Goods", StringComparison.OrdinalIgnoreCase));
            pdiId = (goods ?? pdiRows[0]).TransTypeId;
        }

        var uomRows = await db.FbrPdiUoms.AsNoTracking()
            .Where(x => x.CompanyId == companyId)
            .OrderBy(x => x.UomId)
            .ToListAsync(ct);
        int? uomId = null;
        if (uomRows.Count > 0)
        {
            var pcs = uomRows.FirstOrDefault(x =>
                string.Equals(x.Description.Trim(), "PCS", StringComparison.OrdinalIgnoreCase) ||
                x.Description.Contains("PCS", StringComparison.OrdinalIgnoreCase));
            uomId = (pcs ?? uomRows[0]).UomId;
        }

        return new ExcelImportProductDefaults(pdiId, uomId);
    }

    private async Task<(bool Ok, FbrInvoicesController.UpsertFbrInvoiceLineRequest? Line, string? Error)> TryBuildLineAsync(
        Dictionary<string, string> cells,
        ProductLookup products,
        List<FbrSalesTaxRate> taxRates,
        DateOnly invoiceAsOf,
        int excelRow,
        int companyId,
        ExcelImportProductDefaults importDefaults,
        CancellationToken ct)
    {
        var productNo = GetCell(cells, "ProductNo").Trim();
        var hs = GetCell(cells, "HsCode").Trim();
        var desc = GetCell(cells, "ProductDescription").Trim();

        var (productId, pErr) = await EnsureProductProfileIdAsync(
            companyId,
            productNo,
            hs,
            desc,
            products,
            excelRow,
            importDefaults,
            ct);
        if (pErr is not null)
            return (false, null, pErr);

        var qtyRaw = GetCell(cells, "Quantity");
        var qty = 1m;
        if (!string.IsNullOrWhiteSpace(qtyRaw) &&
            !decimal.TryParse(qtyRaw, NumberStyles.Number, CultureInfo.InvariantCulture, out qty))
        {
            return (false, null, $"Row {excelRow}: invalid Quantity.");
        }

        if (qty <= 0) qty = 1;

        var valExRaw = GetCell(cells, "ValueSalesExcludingST");
        var totalRaw = GetCell(cells, "TotalValues");
        decimal unitPrice = 0;
        if (decimal.TryParse(valExRaw, NumberStyles.Number, CultureInfo.InvariantCulture, out var valEx) &&
            valEx >= 0 && qty > 0)
            unitPrice = decimal.Round(valEx / qty, 6, MidpointRounding.AwayFromZero);
        else if (decimal.TryParse(totalRaw, NumberStyles.Number, CultureInfo.InvariantCulture, out var totalVal) &&
                 totalVal >= 0 && qty > 0)
            unitPrice = decimal.Round(totalVal / qty, 6, MidpointRounding.AwayFromZero);
        else
        {
            return (false, null, $"Row {excelRow}: need numeric ValueSalesExcludingST or TotalValues with Quantity.");
        }

        var rateLabel = GetCell(cells, "Rate").Trim();
        var (tr, taxErr) = await ResolveOrEnsureSalesTaxRateAsync(
            companyId,
            rateLabel,
            invoiceAsOf,
            taxRates,
            ct);
        if (taxErr is not null)
            return (false, null, $"Row {excelRow}: {taxErr}");

        var discRaw = GetCell(cells, "Discount");
        var disc = 0m;
        if (!string.IsNullOrWhiteSpace(discRaw) &&
            decimal.TryParse(discRaw, NumberStyles.Number, CultureInfo.InvariantCulture, out var d))
        {
            if (d is >= 0 and <= 100)
                disc = d;
        }

        var line = new FbrInvoicesController.UpsertFbrInvoiceLineRequest
        {
            ProductProfileId = productId,
            Quantity = qty,
            UnitPrice = unitPrice,
            TaxRate = tr!.Percentage,
            FbrSalesTaxRateId = tr.Id,
            DiscountRate = disc,
            Remarks = string.IsNullOrWhiteSpace(desc) ? "" : desc,
        };

        return (true, line, null);
    }

    private async Task<(FbrSalesTaxRate? Rate, string? Error)> ResolveOrEnsureSalesTaxRateAsync(
        int companyId,
        string rateRaw,
        DateOnly asOf,
        List<FbrSalesTaxRate> taxRates,
        CancellationToken ct)
    {
        static bool EffectiveOn(FbrSalesTaxRate r, DateOnly d) =>
            r.EffectiveFrom <= d && (r.EffectiveTo == null || r.EffectiveTo >= d);

        var trimmed = rateRaw.Trim();
        if (string.IsNullOrEmpty(trimmed))
            return (null, "Rate (sales tax label or percent) is required.");

        foreach (var r in taxRates.Where(x => EffectiveOn(x, asOf)))
        {
            if (string.Equals(r.Label.Trim(), trimmed, StringComparison.OrdinalIgnoreCase))
                return (r, null);
        }

        if (!TryParseHumanPercent(trimmed, out var pctOn100))
        {
            return (null,
                $"no sales tax rate matches Rate \"{trimmed}\" on invoice date; add it under Catalog → Taxes.");
        }

        var mult = pctOn100 / 100m;
        const decimal eps = 0.0000005m;
        var byPct = taxRates.Where(x => EffectiveOn(x, asOf)).FirstOrDefault(r =>
            Math.Abs(r.Percentage - mult) < eps ||
            Math.Abs(r.Percentage * 100m - pctOn100) < 0.0001m);
        if (byPct is not null)
            return (byPct, null);

        var canonical = TruncateStr(FormatPercentLabel(pctOn100), 32);
        var seedFrom = new DateOnly(2010, 1, 1);

        var existingSame = await db.FbrSalesTaxRates.AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.CompanyId == companyId && x.Label == canonical && x.EffectiveFrom == seedFrom,
                ct);
        if (existingSame is not null)
        {
            if (!taxRates.Any(t => t.Id == existingSame.Id))
                taxRates.Add(existingSame);
            if (!EffectiveOn(existingSame, asOf))
            {
                return (null,
                    $"Rate \"{canonical}\" exists but is not effective on invoice date; adjust Effective dates in Taxes.");
            }

            return (existingSame, null);
        }

        var entity = new FbrSalesTaxRate
        {
            CompanyId = companyId,
            Label = canonical,
            Percentage = mult,
            EffectiveFrom = seedFrom,
            EffectiveTo = null,
        };
        db.FbrSalesTaxRates.Add(entity);
        await db.SaveChangesAsync(ct);
        taxRates.Add(entity);
        return (entity, null);
    }

    private static bool TryParseHumanPercent(string raw, out decimal percentOnHundred)
    {
        percentOnHundred = 0;
        var t = raw.Trim().Replace("\u00A0", " ", StringComparison.Ordinal);
        var hadPct = t.EndsWith("%", StringComparison.Ordinal);
        if (hadPct)
            t = t[..^1].Trim();
        if (!decimal.TryParse(t, NumberStyles.Number, CultureInfo.InvariantCulture, out var v))
            return false;
        if (!hadPct && v is >= 0 and <= 1m)
            percentOnHundred = v * 100m;
        else
            percentOnHundred = v;
        return true;
    }

    private static string FormatPercentLabel(decimal percentOnHundred)
    {
        var d = decimal.Round(percentOnHundred, 6, MidpointRounding.AwayFromZero);
        if (d == decimal.Truncate(d))
            return decimal.Truncate(d).ToString(CultureInfo.InvariantCulture) + "%";
        return d.ToString(CultureInfo.InvariantCulture) + "%";
    }

    private async Task<(Guid Id, string? Error)> EnsureProductProfileIdAsync(
        int companyId,
        string productNo,
        string hsRaw,
        string description,
        ProductLookup pl,
        int excelRow,
        ExcelImportProductDefaults importDefaults,
        CancellationToken ct)
    {
        var hs = hsRaw.Trim();

        if (!string.IsNullOrEmpty(hs) && pl.ByHsCode.TryGetValue(hs, out var byHs))
        {
            if (byHs.Count == 1)
                return (byHs[0], null);
            if (byHs.Count > 1)
            {
                if (!string.IsNullOrEmpty(productNo) &&
                    pl.ByProductNo.TryGetValue(productNo, out var byNo) &&
                    byHs.Contains(byNo))
                    return (byNo, null);
                return (default, $"Row {excelRow}: HsCode \"{hs}\" matches multiple products; set ProductNo.");
            }
        }

        if (!string.IsNullOrEmpty(productNo) && pl.ByProductNo.TryGetValue(productNo, out var pid))
            return (pid, null);

        if (string.IsNullOrEmpty(hs))
        {
            if (!string.IsNullOrEmpty(productNo))
                return (default, $"Row {excelRow}: unknown ProductNo \"{productNo}\"; add HsCode to create a new product.");
            return (default, $"Row {excelRow}: ProductNo or HsCode is required.");
        }

        return await CreateProductProfileAsync(
            companyId,
            productNo,
            hs,
            description,
            pl,
            excelRow,
            importDefaults,
            ct);
    }

    private async Task<(Guid Id, string? Error)> CreateProductProfileAsync(
        int companyId,
        string desiredProductNo,
        string hsTrimmed,
        string description,
        ProductLookup pl,
        int excelRow,
        ExcelImportProductDefaults importDefaults,
        CancellationToken ct)
    {
        var hs = TruncateStr(hsTrimmed, 50);
        if (string.IsNullOrEmpty(hs))
            return (default, $"Row {excelRow}: HsCode is required to create a product.");

        var name = string.IsNullOrWhiteSpace(description)
            ? TruncateStr($"Imported {hs}", 200)
            : TruncateStr(description, 200);

        var baseNo = !string.IsNullOrWhiteSpace(desiredProductNo)
            ? TruncateStr(desiredProductNo, 50)
            : SanitizeProductNoBase(hs);

        if (importDefaults.FbrPdiTransTypeId is null or <= 0)
        {
            return (default,
                $"Row {excelRow}: cannot auto-create product for HsCode \"{hs}\" because FBR transaction types (PDI) are not synced for this company. " +
                "Sync PDI masters from FBR (or create the product in the catalog with a PDI type), then import again.");
        }

        var prodNo = await AllocateUniqueProductNoAsync(companyId, baseNo, ct);

        var entity = new ProductProfile
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            ProductNo = prodNo,
            ProductName = name,
            HsCode = hs,
            CreatedAtUtc = DateTime.UtcNow,
            FbrPdiTransTypeId = importDefaults.FbrPdiTransTypeId,
            FbrUomId = importDefaults.FbrUomId,
        };

        db.ProductProfiles.Add(entity);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            return (default, $"Row {excelRow}: could not create product \"{prodNo}\": {ex.Message}");
        }

        pl.ByProductNo[prodNo] = entity.Id;
        if (!pl.ByHsCode.TryGetValue(hs, out var list))
        {
            list = [];
            pl.ByHsCode[hs] = list;
        }

        list.Add(entity.Id);
        return (entity.Id, null);
    }

    private static string SanitizeProductNoBase(string hs)
    {
        var alnum = new string(hs.Where(char.IsLetterOrDigit).ToArray());
        if (string.IsNullOrEmpty(alnum))
            alnum = "ITEM";
        return TruncateStr("XLS-" + alnum, 50);
    }

    private async Task<string> AllocateUniqueProductNoAsync(int companyId, string baseNo, CancellationToken ct)
    {
        var stem = TruncateStr(baseNo, 50);
        var candidate = stem;
        for (var i = 0; i < 200; i++)
        {
            var exists = await db.ProductProfiles.AnyAsync(
                x => x.CompanyId == companyId && x.ProductNo == candidate,
                ct);
            if (!exists)
                return candidate;

            var suffix = "-" + (i + 2);
            var maxStem = Math.Max(1, 50 - suffix.Length);
            var nextStem = stem.Length <= maxStem ? stem : stem[..maxStem];
            candidate = TruncateStr(nextStem + suffix, 50);
        }

        return TruncateStr(stem + "-" + Guid.NewGuid().ToString("N")[..6], 50);
    }
}
