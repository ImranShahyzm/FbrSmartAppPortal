using System.Globalization;
using System.Text;
using System.Text.Json;
using ClosedXML.Excel;
using FbrSmartApp.Api.Models;

namespace FbrSmartApp.Api.Services;

/// <summary>Parses flexible CSV/Excel chart-of-accounts layouts and infers leaf account types from titles.</summary>
public static class GlChartOfAccountsFlexibleImport
{
    public const int MaxDataRows = 10_000;

    public sealed record ColumnMap(
        int Code,
        int AccountName,
        int AccountTypeId,
        int AccountTypeTitle,
        int AllowReconciliation,
        int AccountCurrency,
        int ReadOnly,
        int CompanyNames);

    public sealed record ImportParsedRow(
        int LineNumber,
        string Code,
        string AccountName,
        int? AccountTypeId,
        string? AccountTypeTitle,
        bool? AllowReconciliation,
        string? AccountCurrency,
        bool? ReadOnly,
        string? CompanyNamesRaw);

    public sealed record ImportParseResult(string? FatalError, IReadOnlyList<ImportParsedRow> DataRows, ColumnMap Columns);

    public static async Task<ImportParseResult> ParseAsync(Stream stream, string fileName, CancellationToken ct)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (ext is ".csv" or ".txt")
            return await ParseCsvAsync(stream, ct);

        if (ext is ".xlsx" or ".xlsm")
            return await ParseExcelAsync(stream, ct);

        return new ImportParseResult(
            "Unsupported file type. Use .csv, .txt, or .xlsx.",
            Array.Empty<ImportParsedRow>(),
            EmptyColumnMap());
    }

    public static ColumnMap EmptyColumnMap() =>
        new(-1, -1, -1, -1, -1, -1, -1, -1);

    /// <summary>Pick a leaf account-type id from free-text title (keywords, ordered by specificity).</summary>
    public static int? InferAccountTypeId(string? accountTitle, HashSet<int> validLeafIds)
    {
        if (string.IsNullOrWhiteSpace(accountTitle) || validLeafIds.Count == 0)
            return null;

        var t = accountTitle.Trim().ToUpperInvariant();

        static bool Has(string hay, string needle) =>
            hay.Contains(needle, StringComparison.Ordinal);

        (string[] Keys, int TypeId)[] rules =
        [
            (["COST OF SALES", "COST OF GOODS", "COGS", "DIRECT COST"], 23),
            (["NON-CURRENT LIABILITY", "LONG TERM LOAN", "LONG-TERM LOAN", "TERM LOAN"], 17),
            (["CURRENT LIABILITY", "CURRENT LIABIL", "ACCRUED", "TAX PAYABLE", "WITHHOLDING"], 16),
            (["CREDIT CARD"], 15),
            (["PAYABLE", "CREDITOR", "CREDITORS", "A/P", " ACCOUNTS PAYABLE"], 14),
            (["FIXED ASSET", "PPE", "PROPERTY, PLANT", "DEPRECIABLE"], 13),
            (["PREPAID", "PREPAYMENT"], 12),
            (["NON-CURRENT ASSET", "LONG TERM ASSET"], 11),
            (["INVENTORY", "STOCK", "STORE", "WAREHOUSE"], 10),
            (["CURRENT ASSET", "CASH AND BANK", "BANK BALANCE"], 10),
            (["BANK", "CASH", "OVERDRAFT", "BANK GUARANTEE", "DISCOUNTING"], 9),
            (["RECEIVABLE", "DEBTOR", "DEBTORS", "A/R", " ACCOUNTS RECEIVABLE"], 8),
            (["OTHER INCOME"], 21),
            (["OTHER EXPENSE", "MISCELLANEOUS EXP"], 25),
            (["DEPRECIATION", "AMORTIZATION"], 24),
            (["INCOME", "REVENUE", "SALES", "TURNOVER"], 20),
            (["EXPENSE", "EXPENSES", "CHARGES", "FEES"], 22),
            (["CURRENT YEAR EARNING", "NET INCOME", "PROFIT FOR THE YEAR"], 19),
            (["EQUITY", "SHARE CAPITAL", "RETAINED", "CAPITAL"], 18),
            (["LIABILITY", "LIABILITIES"], 16),
            (["ASSET", "ASSETS"], 10),
        ];

        foreach (var (keys, typeId) in rules)
        {
            if (!validLeafIds.Contains(typeId))
                continue;
            foreach (var k in keys)
            {
                if (Has(t, k))
                    return typeId;
            }
        }

        return validLeafIds.Contains(10) ? 10 : validLeafIds.Min();
    }

    private static async Task<ImportParseResult> ParseCsvAsync(Stream stream, CancellationToken ct)
    {
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        var lines = new List<string>();
        while (!reader.EndOfStream)
        {
            ct.ThrowIfCancellationRequested();
            var line = await reader.ReadLineAsync(ct);
            if (line is null) break;
            if (string.IsNullOrWhiteSpace(line)) continue;
            lines.Add(line);
        }

        if (lines.Count == 0)
            return new ImportParseResult("The file is empty.", Array.Empty<ImportParsedRow>(), EmptyColumnMap());

        var headerFields = ParseCsvLine(lines[0]);
        var col = BuildColumnMap(headerFields);
        if (col.Code < 0 || col.AccountName < 0)
            return new ImportParseResult(
                "Missing required columns: need an account code column and an account title/name column.",
                Array.Empty<ImportParsedRow>(),
                col);

        var rows = new List<ImportParsedRow>();
        for (var i = 1; i < lines.Count; i++)
        {
            ct.ThrowIfCancellationRequested();
            rows.Add(ParseOneCsvRow(lines[i], col, i + 1));
        }

        return new ImportParseResult(null, rows, col);
    }

    private static ImportParsedRow ParseOneCsvRow(string line, ColumnMap col, int lineNumber)
    {
        var fields = ParseCsvLine(line);
        string Get(int idx) => idx >= 0 && idx < fields.Length ? fields[idx].Trim() : "";

        var code = Get(col.Code);
        var name = Get(col.AccountName);
        if (string.IsNullOrWhiteSpace(code) && string.IsNullOrWhiteSpace(name))
            return new ImportParsedRow(lineNumber, "", "", null, null, null, null, null, null);

        int? typeId = null;
        if (col.AccountTypeId >= 0)
        {
            var raw = Get(col.AccountTypeId);
            if (!string.IsNullOrWhiteSpace(raw) &&
                int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var tid))
                typeId = tid;
        }

        var typeTitle = col.AccountTypeTitle >= 0 ? Get(col.AccountTypeTitle) : null;
        if (string.IsNullOrWhiteSpace(typeTitle))
            typeTitle = null;

        bool? allowRec = null;
        if (col.AllowReconciliation >= 0)
            allowRec = ParseBoolLoose(Get(col.AllowReconciliation)) ?? false;

        var cur = col.AccountCurrency >= 0 ? Get(col.AccountCurrency) : null;
        if (string.IsNullOrWhiteSpace(cur))
            cur = null;

        bool? ro = null;
        if (col.ReadOnly >= 0)
            ro = ParseBoolLoose(Get(col.ReadOnly)) ?? false;

        var companies = col.CompanyNames >= 0 ? Get(col.CompanyNames) : null;
        if (string.IsNullOrWhiteSpace(companies))
            companies = null;

        return new ImportParsedRow(
            lineNumber,
            code,
            name,
            typeId,
            typeTitle,
            allowRec,
            cur,
            ro,
            companies);
    }

    private static async Task<ImportParseResult> ParseExcelAsync(Stream stream, CancellationToken ct)
    {
        await using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, ct);
        if (ms.Length == 0)
            return new ImportParseResult("The file is empty.", Array.Empty<ImportParsedRow>(), EmptyColumnMap());
        ms.Position = 0;

        using var wb = new XLWorkbook(ms);
        var ws = wb.Worksheets.FirstOrDefault(w =>
            w.Name.Contains("chart", StringComparison.OrdinalIgnoreCase) ||
            w.Name.Contains("coa", StringComparison.OrdinalIgnoreCase) ||
            w.Name.Contains("account", StringComparison.OrdinalIgnoreCase));
        ws ??= wb.Worksheets.First();

        var headerRow = FindHeaderRow(ws, out var col);
        if (headerRow < 0)
        {
            var debug = BuildExcelHeaderDebug(ws);
            return new ImportParseResult(
                "Missing required columns: need Code and AccountName (see import template). " +
                $"Detected (first rows): {debug}",
                Array.Empty<ImportParsedRow>(),
                col);
        }

        var lastRow = ws.LastRowUsed()?.RowNumber() ?? headerRow;
        var rows = new List<ImportParsedRow>();
        for (var r = headerRow + 1; r <= lastRow; r++)
        {
            ct.ThrowIfCancellationRequested();
            var cells = ReadRowAsStrings(ws, r);
            if (cells.Length == 0)
                continue;

            string Get(int idx) => idx >= 0 && idx < cells.Length ? cells[idx] : "";

            var code = Get(col.Code);
            var name = Get(col.AccountName);
            if (string.IsNullOrWhiteSpace(code) && string.IsNullOrWhiteSpace(name))
                continue;

            int? typeId = null;
            if (col.AccountTypeId >= 0)
            {
                var raw = Get(col.AccountTypeId);
                if (!string.IsNullOrWhiteSpace(raw) &&
                    int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var tid))
                    typeId = tid;
            }

            var typeTitle = col.AccountTypeTitle >= 0 ? Get(col.AccountTypeTitle) : null;
            if (string.IsNullOrWhiteSpace(typeTitle))
                typeTitle = null;

            bool? allowRec = null;
            if (col.AllowReconciliation >= 0)
                allowRec = ParseBoolLoose(Get(col.AllowReconciliation)) ?? false;

            var cur = col.AccountCurrency >= 0 ? Get(col.AccountCurrency) : null;
            if (string.IsNullOrWhiteSpace(cur))
                cur = null;

            bool? ro = null;
            if (col.ReadOnly >= 0)
                ro = ParseBoolLoose(Get(col.ReadOnly)) ?? false;

            var companies = col.CompanyNames >= 0 ? Get(col.CompanyNames) : null;
            if (string.IsNullOrWhiteSpace(companies))
                companies = null;

            rows.Add(new ImportParsedRow(
                r,
                code,
                name,
                typeId,
                typeTitle,
                allowRec,
                cur,
                ro,
                companies));
        }

        return new ImportParseResult(null, rows, col);
    }

    private static int FindHeaderRow(IXLWorksheet ws, out ColumnMap bestMap)
    {
        bestMap = EmptyColumnMap();
        var first = ws.FirstRowUsed()?.RowNumber() ?? 1;
        var last = ws.LastRowUsed()?.RowNumber() ?? first;
        var scanEnd = Math.Min(first + 60, Math.Max(last, first + 60));

        var bestScore = 0;
        var bestRow = -1;
        for (var r = first; r <= scanEnd; r++)
        {
            var cells = ReadRowAsStrings(ws, r);
            if (cells.Length < 2)
                continue;

            var map = BuildColumnMap(cells);
            var score = (map.Code >= 0 ? 1 : 0) + (map.AccountName >= 0 ? 1 : 0);
            if (score > bestScore)
            {
                bestScore = score;
                bestRow = r;
                bestMap = map;
            }
        }

        return bestScore >= 2 ? bestRow : -1;
    }

    private static string BuildExcelHeaderDebug(IXLWorksheet ws)
    {
        try
        {
            var first = ws.FirstRowUsed()?.RowNumber() ?? 1;
            var last = ws.LastRowUsed()?.RowNumber() ?? first;
            var scanEnd = Math.Min(first + 5, last);
            var parts = new List<string>();
            for (var r = first; r <= scanEnd; r++)
            {
                var cells = ReadRowAsStrings(ws, r);
                var joined = string.Join(" | ", cells.Select(c => (c ?? "").Trim()).Where(c => c.Length > 0).Take(12));
                if (string.IsNullOrWhiteSpace(joined)) continue;
                parts.Add($"R{r}: {joined}");
            }
            return parts.Count > 0 ? string.Join(" ; ", parts) : "no visible text cells";
        }
        catch
        {
            return "unavailable";
        }
    }

    private static string[] ReadRowAsStrings(IXLWorksheet ws, int row)
    {
        var rowObj = ws.Row(row);
        if (!rowObj.CellsUsed().Any())
            return Array.Empty<string>();

        var maxCol = rowObj.CellsUsed().Max(c => c.Address.ColumnNumber);
        var list = new List<string>(maxCol);
        for (var c = 1; c <= maxCol; c++)
            list.Add(GetCellText(ws.Cell(row, c)));
        return list.ToArray();
    }

    private static string GetCellText(IXLCell cell)
    {
        if (cell.IsEmpty())
            return "";

        try
        {
            var fmt = cell.GetFormattedString();
            if (!string.IsNullOrWhiteSpace(fmt))
                return fmt.Trim();
        }
        catch
        {
            /* fall through */
        }

        return cell.Value.ToString()?.Trim() ?? "";
    }

    public static ColumnMap BuildColumnMap(string[] headerFields)
    {
        static string Norm(string s) =>
            s.Trim().Trim('\uFEFF').Replace(" ", "", StringComparison.Ordinal)
                .Replace("_", "", StringComparison.Ordinal).ToLowerInvariant();

        var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < headerFields.Length; i++)
        {
            var key = Norm(headerFields[i]);
            if (key.Length > 0)
                map[key] = i;
        }

        int Idx(params string[] keys)
        {
            foreach (var k in keys)
            {
                if (map.TryGetValue(k, out var idx))
                    return idx;
            }

            return -1;
        }

        var code = Idx(
            "accountcode",
            "accntcode",
            "acctcode",
            "glcode",
            "ledgercode",
            "code",
            "accountno",
            "accountnumber",
            "accno");
        var name = Idx(
            "accounttitle",
            "accttitle",
            "accountname",
            "acctname",
            "accountdescription",
            "description",
            "particulars",
            "title",
            "gltitle",
            "name",
            "account");
        var typeId = Idx("accounttypeid", "gltype", "typeid", "acctypeid");
        var typeTitle = Idx("accounttypetitle", "typetitle", "acctype", "accounttype");
        var rec = Idx("allowreconciliation", "reconcile", "reconciliation");
        var cur = Idx("accountcurrency", "currency", "curr");
        var ro = Idx("readonly");
        var companies = Idx(
            "companies",
            "companynames",
            "companyname",
            "company",
            "entity",
            "entities",
            "legalentity");
        return new ColumnMap(code, name, typeId, typeTitle, rec, cur, ro, companies);
    }

    private static bool? ParseBoolLoose(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        var t = s.Trim();
        if (t.Equals("1", StringComparison.Ordinal) ||
            t.Equals("true", StringComparison.OrdinalIgnoreCase) ||
            t.Equals("yes", StringComparison.OrdinalIgnoreCase) ||
            t.Equals("y", StringComparison.OrdinalIgnoreCase))
            return true;
        if (t.Equals("0", StringComparison.Ordinal) ||
            t.Equals("false", StringComparison.OrdinalIgnoreCase) ||
            t.Equals("no", StringComparison.OrdinalIgnoreCase) ||
            t.Equals("n", StringComparison.OrdinalIgnoreCase))
            return false;
        return null;
    }

    private static string[] ParseCsvLine(string line)
    {
        var fields = new List<string>();
        var sb = new StringBuilder();
        var inQuotes = false;
        for (var i = 0; i < line.Length; i++)
        {
            var c = line[i];
            if (inQuotes)
            {
                if (c == '"')
                {
                    if (i + 1 < line.Length && line[i + 1] == '"')
                    {
                        sb.Append('"');
                        i++;
                    }
                    else
                    {
                        inQuotes = false;
                    }
                }
                else
                {
                    sb.Append(c);
                }
            }
            else if (c == '"')
            {
                inQuotes = true;
            }
            else if (c == ',')
            {
                fields.Add(sb.ToString());
                sb.Clear();
            }
            else
            {
                sb.Append(c);
            }
        }

        fields.Add(sb.ToString());
        return fields.ToArray();
    }

    public static IReadOnlyList<int> ResolveTargetCompanyIds(
        string? companyNamesRaw,
        int currentCompanyId,
        IReadOnlyDictionary<string, int> companyIdByExactTitle,
        List<string> errors,
        string lineLabel,
        int maxErrors)
    {
        if (string.IsNullOrWhiteSpace(companyNamesRaw))
            return new[] { currentCompanyId };

        var parts = companyNamesRaw
            .Split(new[] { ';', ',', '|', '\n' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(p => p.Trim())
            .Where(p => p.Length > 0)
            .ToList();

        if (parts.Count == 0)
            return new[] { currentCompanyId };

        var ids = new List<int>();
        foreach (var p in parts)
        {
            if (!companyIdByExactTitle.TryGetValue(p, out var id))
            {
                if (errors.Count < maxErrors)
                    errors.Add($"{lineLabel}: Unknown company name \"{p}\" (must match GLCompany.Title exactly).");
                return Array.Empty<int>();
            }

            if (!ids.Contains(id))
                ids.Add(id);
        }

        return ids;
    }

    public static bool UserMayWriteChartForCompany(User user, int targetCompanyId, int currentCompanyId)
    {
        if (string.Equals(user.Role, "Admin", StringComparison.OrdinalIgnoreCase))
            return true;
        if (targetCompanyId == currentCompanyId)
            return true;
        try
        {
            var ids = JsonSerializer.Deserialize<List<int>>(user.AllowedCompanyIdsJson ?? "[]");
            return ids?.Contains(targetCompanyId) ?? false;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}
