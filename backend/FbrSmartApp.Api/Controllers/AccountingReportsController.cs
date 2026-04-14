using System.Data;
using System.Data.Common;
using System.Globalization;
using System.Security.Claims;
using FbrSmartApp.Api.Auth;
using FbrSmartApp.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

/// <summary>
/// On-screen accounting reports (trial balance, etc.). Uses parameterized SQL against GLvMAIN / GLvDetail / GLChartOFAccount.
/// Indexes recommended for performance: GLvMAIN(Comp_Id, vDate), GLvDetail(vID), GLvDetail(GlAccountID).
/// </summary>
[ApiController]
[Route("api/accountingReports")]
[Authorize]
public sealed class AccountingReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AccountingReportsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("trial-balance")]
    [HasPermission("accounting.accountingReports.read")]
    public async Task<IActionResult> GetTrialBalance(
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] int? branchId,
        [FromQuery] int? fiscalId,
        [FromQuery] bool postedOnly = true,
        [FromQuery] bool nonZeroClosingOnly = false,
        CancellationToken ct = default)
    {
        if (dateFrom is null || dateTo is null)
            return BadRequest(new { message = "dateFrom and dateTo are required." });

        var from = dateFrom.Value.Date;
        var to = dateTo.Value.Date;
        if (from > to)
            return BadRequest(new { message = "dateFrom must be on or before dateTo." });

        var companyId = GetCompanyIdOrThrow();

        var conn = _db.Database.GetDbConnection();
        if (string.IsNullOrWhiteSpace(conn.ConnectionString))
        {
            var cs = _db.Database.GetConnectionString();
            if (!string.IsNullOrWhiteSpace(cs)) conn.ConnectionString = cs;
        }

        if (conn.State != ConnectionState.Open)
            await _db.Database.OpenConnectionAsync(ct);

        var schema = await GetTrialBalanceSchemaFlagsAsync(conn, ct);
        var hasUnposted = await HasUnpostedVouchersAsync(conn, companyId, from, to, branchId, fiscalId, schema, ct);

        var sql = BuildTrialBalanceSql(schema, nonZeroClosingOnly);

        var rows = new List<TrialBalanceRowDto>();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = sql;
            cmd.CommandTimeout = 120;
            AddParam(cmd, "@CompanyId", companyId);
            AddParam(cmd, "@DateFrom", from);
            AddParam(cmd, "@DateTo", to);
            AddParam(cmd, "@PostedOnly", postedOnly ? 1 : 0);
            if (schema.HasBranchId)
                AddParam(cmd, "@BranchId", branchId.HasValue ? branchId.Value : DBNull.Value);
            if (schema.HasFiscalId)
                AddParam(cmd, "@FiscalId", fiscalId.HasValue ? fiscalId.Value : DBNull.Value);

            await using var reader = await cmd.ExecuteReaderAsync(ct);
            while (await reader.ReadAsync(ct))
            {
                rows.Add(new TrialBalanceRowDto
                {
                    glCaid = ReadSqlInt32(reader, "GLCAID"),
                    glCode = ReadSqlString(reader, "GLCode"),
                    glTitle = ReadSqlString(reader, "GLTitle"),
                    level = ReadSqlInt32(reader, "Level"),
                    isParent = ReadSqlInt32(reader, "IsParent"),
                    glNature = ReadSqlInt32(reader, "GLNature"),
                    glLevel = ReadSqlInt32(reader, "GLLevel"),
                    glType = ReadSqlNullableInt32(reader, "GlType"),
                    openingBalance = ReadSqlDecimal(reader, "OpeningBalance"),
                    periodDr = ReadSqlDecimal(reader, "PeriodDr"),
                    periodCr = ReadSqlDecimal(reader, "PeriodCr"),
                    endBalance = ReadSqlDecimal(reader, "EndBalance"),
                });
            }
        }

        return Ok(new TrialBalanceResponseDto
        {
            rows = rows,
            hasUnpostedInPeriod = hasUnposted,
            dateFrom = from.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            dateTo = to.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            postedOnly = postedOnly,
        });
    }

    /// <summary>Same data as <see cref="GetTrialBalance"/> — used by the General Ledger collapsed account summary.</summary>
    [HttpGet("general-ledger/summary")]
    [HasPermission("accounting.accountingReports.read")]
    public Task<IActionResult> GetGeneralLedgerSummary(
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] int? branchId,
        [FromQuery] int? fiscalId,
        [FromQuery] bool postedOnly = true,
        [FromQuery] bool nonZeroClosingOnly = true,
        CancellationToken ct = default)
        => GetTrialBalance(dateFrom, dateTo, branchId, fiscalId, postedOnly, nonZeroClosingOnly, ct);

    [HttpGet("general-ledger/lines")]
    [HasPermission("accounting.accountingReports.read")]
    public async Task<IActionResult> GetGeneralLedgerLines(
        [FromQuery] int glCaid,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] int? branchId,
        [FromQuery] int? fiscalId,
        [FromQuery] bool postedOnly = true,
        CancellationToken ct = default)
    {
        if (glCaid <= 0)
            return BadRequest(new { message = "glCaid is required." });
        if (dateFrom is null || dateTo is null)
            return BadRequest(new { message = "dateFrom and dateTo are required." });

        var from = dateFrom.Value.Date;
        var to = dateTo.Value.Date;
        if (from > to)
            return BadRequest(new { message = "dateFrom must be on or before dateTo." });

        var companyId = GetCompanyIdOrThrow();

        var conn = _db.Database.GetDbConnection();
        if (string.IsNullOrWhiteSpace(conn.ConnectionString))
        {
            var cs = _db.Database.GetConnectionString();
            if (!string.IsNullOrWhiteSpace(cs)) conn.ConnectionString = cs;
        }

        if (conn.State != ConnectionState.Open)
            await _db.Database.OpenConnectionAsync(ct);

        var tb = await GetTrialBalanceSchemaFlagsAsync(conn, ct);
        var glx = await GetGeneralLedgerExtraSchemaFlagsAsync(conn, ct);

        await using (var verify = conn.CreateCommand())
        {
            verify.CommandText = """
                SELECT CASE WHEN EXISTS (
                    SELECT 1 FROM dbo.GLChartOFAccount a
                    WHERE a.GLCAID = @GlCaid AND a.Companyid = @CompanyId
                ) THEN 1 ELSE 0 END
                """;
            AddParam(verify, "@GlCaid", glCaid);
            AddParam(verify, "@CompanyId", companyId);
            var ok = Convert.ToInt32(await verify.ExecuteScalarAsync(ct));
            if (ok == 0)
                return NotFound(new { message = "GL account not found for this company." });
        }

        var openingSql = BuildGeneralLedgerOpeningSql(tb, glx);
        decimal openingBalance;
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = openingSql;
            cmd.CommandTimeout = 120;
            AddParam(cmd, "@CompanyId", companyId);
            AddParam(cmd, "@GlCaid", glCaid);
            AddParam(cmd, "@DateFrom", from);
            AddParam(cmd, "@PostedOnly", postedOnly ? 1 : 0);
            if (tb.HasBranchId)
                AddParam(cmd, "@BranchId", branchId.HasValue ? branchId.Value : DBNull.Value);
            if (tb.HasFiscalId)
                AddParam(cmd, "@FiscalId", fiscalId.HasValue ? fiscalId.Value : DBNull.Value);
            var o = await cmd.ExecuteScalarAsync(ct);
            openingBalance = o is null or DBNull ? 0m : Convert.ToDecimal(o, CultureInfo.InvariantCulture);
        }

        var linesSql = BuildGeneralLedgerLinesSql(tb, glx);
        var lines = new List<GeneralLedgerLineDto>();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = linesSql;
            cmd.CommandTimeout = 120;
            AddParam(cmd, "@CompanyId", companyId);
            AddParam(cmd, "@GlCaid", glCaid);
            AddParam(cmd, "@DateFrom", from);
            AddParam(cmd, "@DateTo", to);
            AddParam(cmd, "@PostedOnly", postedOnly ? 1 : 0);
            if (tb.HasBranchId)
                AddParam(cmd, "@BranchId", branchId.HasValue ? branchId.Value : DBNull.Value);
            if (tb.HasFiscalId)
                AddParam(cmd, "@FiscalId", fiscalId.HasValue ? fiscalId.Value : DBNull.Value);

            await using var reader = await cmd.ExecuteReaderAsync(ct);
            var running = openingBalance;
            while (await reader.ReadAsync(ct))
            {
                var debit = ReadSqlDecimal(reader, "Debit");
                var credit = ReadSqlDecimal(reader, "Credit");
                running += debit - credit;
                lines.Add(new GeneralLedgerLineDto
                {
                    vDetailId = ReadSqlInt32(reader, "vDetailID"),
                    vId = ReadSqlInt32(reader, "vID"),
                    voucherTypeTitle = ReadSqlString(reader, "VoucherTypeTitle"),
                    voucherNo = ReadSqlString(reader, "VoucherNo"),
                    vDate = ReadSqlDateOnlyString(reader, "VDate"),
                    enteredAt = ReadSqlDateTimeIso(reader, "vEnterDate"),
                    narration = ReadSqlString(reader, "Narration"),
                    debit = debit,
                    credit = credit,
                    runningBalance = running,
                    schemeId = ReadSqlNullableInt32(reader, "SchemeId"),
                    schemeName = NullIfEmpty(ReadSqlString(reader, "SchemeName")),
                    schemeShortCode = NullIfEmpty(ReadSqlString(reader, "SchemeShortCode")),
                    partnerName = NullIfEmpty(ReadSqlString(reader, "PartnerName")),
                    prNumber = NullIfEmpty(ReadSqlString(reader, "PrNumber")),
                });
            }
        }

        return Ok(new GeneralLedgerLinesResponseDto
        {
            glCaid = glCaid,
            openingBalance = openingBalance,
            lines = lines,
        });
    }

    private static string? NullIfEmpty(string s) => string.IsNullOrWhiteSpace(s) ? null : s;

    private sealed record GeneralLedgerExtraSchemaFlags(
        bool HasSchemeIdOnDetail,
        bool HasLogSourceOnMain,
        bool HasIsLogOnDetail,
        bool HasGenPesSchemeInfo,
        bool HasPartyIdOnDetail,
        bool HasPrVoucherInfo);

    private static async Task<GeneralLedgerExtraSchemaFlags> GetGeneralLedgerExtraSchemaFlagsAsync(
        DbConnection conn,
        CancellationToken ct)
    {
        async Task<bool> HasColumn(string table, string column)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                SELECT CASE WHEN EXISTS (
                    SELECT 1
                    FROM sys.columns c
                    INNER JOIN sys.tables t ON c.object_id = t.object_id
                    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
                    WHERE s.name = N'dbo' AND t.name = @table AND c.name = @column
                ) THEN 1 ELSE 0 END
                """;
            AddParam(cmd, "@table", table);
            AddParam(cmd, "@column", column);
            var o = await cmd.ExecuteScalarAsync(ct);
            return Convert.ToInt32(o) == 1;
        }

        async Task<bool> HasTable(string table)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT CASE WHEN OBJECT_ID(@name, N'U') IS NOT NULL THEN 1 ELSE 0 END";
            AddParam(cmd, "@name", "dbo." + table);
            var o = await cmd.ExecuteScalarAsync(ct);
            return Convert.ToInt32(o) == 1;
        }

        return new GeneralLedgerExtraSchemaFlags(
            await HasColumn("GLvDetail", "SchemeId"),
            await HasColumn("GLvMAIN", "LogSourceID"),
            await HasColumn("GLvDetail", "IsLog"),
            await HasTable("gen_Pes_SchemeInfo"),
            await HasColumn("GLvDetail", "PartyID"),
            await HasTable("data_pes_PRVoucherInfo"));
    }

    private static string BuildGeneralLedgerOpeningSql(TrialBalanceSchemaFlags f, GeneralLedgerExtraSchemaFlags g)
    {
        var showParty = f.HasShowToParty ? "      AND ISNULL(d.ShowToParty, 0) = 0\n" : "";
        var vCancel = f.HasVCancel ? "      AND ISNULL(m.vCancel, 0) = 0\n" : "";
        var branch = f.HasBranchId ? "      AND (@BranchId IS NULL OR m.BranchID = @BranchId)\n" : "";
        var fiscal = f.HasFiscalId ? "      AND (@FiscalId IS NULL OR m.FiscalID = @FiscalId)\n" : "";
        var logSrc = g.HasLogSourceOnMain ? "      AND ISNULL(m.LogSourceID, 0) = 0\n" : "";
        var isLog = g.HasIsLogOnDetail ? "      AND ISNULL(d.IsLog, 0) = 0\n" : "";

        return $"""
SELECT CAST(ISNULL(SUM(CAST(d.dr AS DECIMAL(18,3)) - CAST(d.cr AS DECIMAL(18,3))), 0) AS DECIMAL(18,3))
FROM dbo.GLvDetail d
INNER JOIN dbo.GLvMAIN m ON m.vID = d.vID
WHERE m.Comp_Id = @CompanyId
  AND d.GlAccountID = @GlCaid
{showParty}{vCancel}{logSrc}{isLog}  AND m.vDate < @DateFrom
  AND (@PostedOnly = 0 OR m.vPost = 1)
{branch}{fiscal};
""";
    }

    private static string BuildGeneralLedgerLinesSql(TrialBalanceSchemaFlags f, GeneralLedgerExtraSchemaFlags g)
    {
        var showParty = f.HasShowToParty ? "      AND ISNULL(d.ShowToParty, 0) = 0\n" : "";
        var vCancel = f.HasVCancel ? "      AND ISNULL(m.vCancel, 0) = 0\n" : "";
        var branch = f.HasBranchId ? "      AND (@BranchId IS NULL OR m.BranchID = @BranchId)\n" : "";
        var fiscal = f.HasFiscalId ? "      AND (@FiscalId IS NULL OR m.FiscalID = @FiscalId)\n" : "";
        var logSrc = g.HasLogSourceOnMain ? "      AND ISNULL(m.LogSourceID, 0) = 0\n" : "";
        var isLog = g.HasIsLogOnDetail ? "      AND ISNULL(d.IsLog, 0) = 0\n" : "";

        var schemeJoin = g.HasGenPesSchemeInfo && g.HasSchemeIdOnDetail
            ? "LEFT JOIN dbo.gen_Pes_SchemeInfo sch ON sch.SchemeID = d.SchemeId AND ISNULL(sch.LogSourceID, 0) = 0\n"
            : "";

        var partyJoin = g.HasPartyIdOnDetail
            ? "LEFT JOIN dbo.gen_PartiesInfo p ON p.PartyID = d.PartyID\n"
            : "";

        var schemeCols = g.HasSchemeIdOnDetail
            ? (g.HasGenPesSchemeInfo
                ? """
    d.SchemeId AS SchemeId,
    sch.Title AS SchemeName,
    sch.ShortCode AS SchemeShortCode,
"""
                : """
    d.SchemeId AS SchemeId,
    CAST(NULL AS NVARCHAR(500)) AS SchemeName,
    CAST(NULL AS NVARCHAR(50)) AS SchemeShortCode,
""")
            : """
    CAST(NULL AS INT) AS SchemeId,
    CAST(NULL AS NVARCHAR(500)) AS SchemeName,
    CAST(NULL AS NVARCHAR(50)) AS SchemeShortCode,
""";

        var partnerCol = g.HasPartyIdOnDetail
            ? "    p.PartyName AS PartnerName,\n"
            : "    CAST(NULL AS NVARCHAR(200)) AS PartnerName,\n";

        var prCol = g.HasPrVoucherInfo
            ? "    (SELECT TOP 1 CONVERT(NVARCHAR(100), pr.ManualNo) FROM dbo.data_pes_PRVoucherInfo pr WHERE pr.AccountVoucherID = m.vID AND ISNULL(pr.LogSourceID, 0) = 0) AS PrNumber\n"
            : "    CAST(NULL AS NVARCHAR(100)) AS PrNumber\n";

        return $"""
SELECT
    d.vDetailID,
    m.vID,
    vt.Title AS VoucherTypeTitle,
    m.vNO AS VoucherNo,
    CONVERT(date, m.vDate) AS VDate,
    m.vEnterDate AS vEnterDate,
    d.Narration AS Narration,
    CAST(d.dr AS DECIMAL(18,3)) AS Debit,
    CAST(d.cr AS DECIMAL(18,3)) AS Credit,
{schemeCols}{partnerCol}{prCol}
FROM dbo.GLvDetail d
INNER JOIN dbo.GLvMAIN m ON m.vID = d.vID
INNER JOIN dbo.GLVoucherType vt ON vt.Voucherid = m.vType
{schemeJoin}{partyJoin}WHERE m.Comp_Id = @CompanyId
  AND d.GlAccountID = @GlCaid
{showParty}{vCancel}{logSrc}{isLog}  AND m.vDate >= @DateFrom AND m.vDate <= @DateTo
  AND (@PostedOnly = 0 OR m.vPost = 1)
{branch}{fiscal}
ORDER BY m.vDate, m.vEnterDate, d.vDetailID;
""";
    }

    private static string ReadSqlDateOnlyString(DbDataReader r, string column)
    {
        var ord = r.GetOrdinal(column);
        if (r.IsDBNull(ord)) return "";
        var v = r.GetValue(ord);
        if (v is DateTime dt)
            return dt.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        return Convert.ToString(v, CultureInfo.InvariantCulture) ?? "";
    }

    private static string? ReadSqlDateTimeIso(DbDataReader r, string column)
    {
        var ord = r.GetOrdinal(column);
        if (r.IsDBNull(ord)) return null;
        var v = r.GetValue(ord);
        if (v is DateTime dt)
            return dt.ToString("o", CultureInfo.InvariantCulture);
        return Convert.ToString(v, CultureInfo.InvariantCulture);
    }

    private sealed record TrialBalanceSchemaFlags(
        bool HasBranchId,
        bool HasFiscalId,
        bool HasVCancel,
        bool HasShowToParty);

    /// <summary>
    /// Legacy DBs may omit BranchID/FiscalID (or other columns). Avoid referencing missing columns in SQL.
    /// </summary>
    private static async Task<TrialBalanceSchemaFlags> GetTrialBalanceSchemaFlagsAsync(
        DbConnection conn,
        CancellationToken ct)
    {
        async Task<bool> HasColumn(string table, string column)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                SELECT CASE WHEN EXISTS (
                    SELECT 1
                    FROM sys.columns c
                    INNER JOIN sys.tables t ON c.object_id = t.object_id
                    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
                    WHERE s.name = N'dbo' AND t.name = @table AND c.name = @column
                ) THEN 1 ELSE 0 END
                """;
            AddParam(cmd, "@table", table);
            AddParam(cmd, "@column", column);
            var o = await cmd.ExecuteScalarAsync(ct);
            return Convert.ToInt32(o) == 1;
        }

        return new TrialBalanceSchemaFlags(
            await HasColumn("GLvMAIN", "BranchID"),
            await HasColumn("GLvMAIN", "FiscalID"),
            await HasColumn("GLvMAIN", "vCancel"),
            await HasColumn("GLvDetail", "ShowToParty"));
    }

    private static string BuildTrialBalanceSql(TrialBalanceSchemaFlags f, bool nonZeroClosingOnly)
    {
        var showParty = f.HasShowToParty ? "      AND ISNULL(d.ShowToParty, 0) = 0\n" : "";
        var vCancel = f.HasVCancel ? "      AND ISNULL(m.vCancel, 0) = 0\n" : "";
        var branch = f.HasBranchId ? "      AND (@BranchId IS NULL OR m.BranchID = @BranchId)\n" : "";
        var fiscal = f.HasFiscalId ? "      AND (@FiscalId IS NULL OR m.FiscalID = @FiscalId)\n" : "";

        var endBalExpr = "CAST(ISNULL(o.OpeningBalance, 0) + ISNULL(p.PeriodDr, 0) - ISNULL(p.PeriodCr, 0) AS DECIMAL(18,3))";
        var nonZeroWhere = nonZeroClosingOnly
            ? $"""

WHERE ABS({endBalExpr}) > 0.0005
"""
            : "";

        return $"""
WITH ChartHierarchy AS (
    SELECT
        0 AS Level,
        CAST(a.GLCAID AS VARCHAR(MAX)) AS SortKey,
        a.GLCAID,
        a.GLCode,
        a.GLTitle,
        ISNULL(a.isParent, 0) AS IsParentFlag,
        ISNULL(a.GLNature, 0) AS GLNature,
        ISNULL(a.GLLevel, 0) AS GLLevel,
        a.GLType AS GLType
    FROM dbo.GLChartOFAccount a
    WHERE a.Companyid = @CompanyId AND ISNULL(a.isParent, 0) = 0
    UNION ALL
    SELECT
        h.Level + 1,
        h.SortKey + CAST(a.GLCAID AS VARCHAR(30)),
        a.GLCAID,
        a.GLCode,
        a.GLTitle,
        ISNULL(a.isParent, 0),
        ISNULL(a.GLNature, 0),
        ISNULL(a.GLLevel, 0),
        a.GLType AS GLType
    FROM dbo.GLChartOFAccount a
    INNER JOIN ChartHierarchy h ON a.isParent = h.GLCAID
    WHERE a.Companyid = @CompanyId
),
Opening AS (
    SELECT d.GlAccountID, SUM(CAST(d.dr AS DECIMAL(18,3)) - CAST(d.cr AS DECIMAL(18,3))) AS OpeningBalance
    FROM dbo.GLvDetail d
    INNER JOIN dbo.GLvMAIN m ON m.vID = d.vID
    WHERE m.Comp_Id = @CompanyId
{showParty}{vCancel}      AND m.vDate < @DateFrom
      AND (@PostedOnly = 0 OR m.vPost = 1)
{branch}{fiscal}    GROUP BY d.GlAccountID
),
PeriodAgg AS (
    SELECT d.GlAccountID,
           SUM(CAST(d.dr AS DECIMAL(18,3))) AS PeriodDr,
           SUM(CAST(d.cr AS DECIMAL(18,3))) AS PeriodCr
    FROM dbo.GLvDetail d
    INNER JOIN dbo.GLvMAIN m ON m.vID = d.vID
    WHERE m.Comp_Id = @CompanyId
{showParty}{vCancel}      AND m.vDate >= @DateFrom AND m.vDate <= @DateTo
      AND (@PostedOnly = 0 OR m.vPost = 1)
{branch}{fiscal}    GROUP BY d.GlAccountID
)
SELECT
    h.Level,
    h.SortKey,
    h.GLCAID,
    h.GLCode,
    h.GLTitle,
    h.IsParentFlag AS IsParent,
    h.GLNature,
    h.GLLevel,
    h.GLType AS GlType,
    CAST(ISNULL(o.OpeningBalance, 0) AS DECIMAL(18,3)) AS OpeningBalance,
    CAST(ISNULL(p.PeriodDr, 0) AS DECIMAL(18,3)) AS PeriodDr,
    CAST(ISNULL(p.PeriodCr, 0) AS DECIMAL(18,3)) AS PeriodCr,
    {endBalExpr} AS EndBalance
FROM ChartHierarchy h
LEFT JOIN Opening o ON o.GlAccountID = h.GLCAID
LEFT JOIN PeriodAgg p ON p.GlAccountID = h.GLCAID
{nonZeroWhere}ORDER BY TRY_CONVERT(DECIMAL(38, 0), LTRIM(RTRIM(CONVERT(NVARCHAR(100), h.GLCode)))), h.SortKey
OPTION (MAXRECURSION 32767);
""";
    }

    private static async Task<bool> HasUnpostedVouchersAsync(
        DbConnection conn,
        int companyId,
        DateTime from,
        DateTime to,
        int? branchId,
        int? fiscalId,
        TrialBalanceSchemaFlags f,
        CancellationToken ct)
    {
        var showParty = f.HasShowToParty ? "      AND ISNULL(d.ShowToParty, 0) = 0\n" : "";
        var vCancel = f.HasVCancel ? "      AND ISNULL(m.vCancel, 0) = 0\n" : "";
        var branch = f.HasBranchId ? "      AND (@BranchId IS NULL OR m.BranchID = @BranchId)\n" : "";
        var fiscal = f.HasFiscalId ? "      AND (@FiscalId IS NULL OR m.FiscalID = @FiscalId)\n" : "";

        var sql = $"""
SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM dbo.GLvMAIN m
    INNER JOIN dbo.GLvDetail d ON d.vID = m.vID
    WHERE m.Comp_Id = @CompanyId
{vCancel}{showParty}      AND m.vPost = 0
      AND m.vDate >= @DateFrom AND m.vDate <= @DateTo
{branch}{fiscal}) THEN 1 ELSE 0 END;
""";
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        AddParam(cmd, "@CompanyId", companyId);
        AddParam(cmd, "@DateFrom", from);
        AddParam(cmd, "@DateTo", to);
        if (f.HasBranchId)
            AddParam(cmd, "@BranchId", branchId.HasValue ? branchId.Value : DBNull.Value);
        if (f.HasFiscalId)
            AddParam(cmd, "@FiscalId", fiscalId.HasValue ? fiscalId.Value : DBNull.Value);
        var o = await cmd.ExecuteScalarAsync(ct);
        return Convert.ToInt32(o) == 1;
    }

    private static string ReadSqlString(DbDataReader r, string column)
    {
        var ord = r.GetOrdinal(column);
        if (r.IsDBNull(ord)) return "";
        return Convert.ToString(r.GetValue(ord), CultureInfo.InvariantCulture) ?? "";
    }

    private static int ReadSqlInt32(DbDataReader r, string column)
    {
        var ord = r.GetOrdinal(column);
        if (r.IsDBNull(ord)) return 0;
        return Convert.ToInt32(r.GetValue(ord), CultureInfo.InvariantCulture);
    }

    private static int? ReadSqlNullableInt32(DbDataReader r, string column)
    {
        var ord = r.GetOrdinal(column);
        if (r.IsDBNull(ord)) return null;
        return Convert.ToInt32(r.GetValue(ord), CultureInfo.InvariantCulture);
    }

    private static decimal ReadSqlDecimal(DbDataReader r, string column)
    {
        var ord = r.GetOrdinal(column);
        if (r.IsDBNull(ord)) return 0m;
        return Convert.ToDecimal(r.GetValue(ord), CultureInfo.InvariantCulture);
    }

    private static void AddParam(System.Data.Common.DbCommand cmd, string name, object value)
    {
        var p = cmd.CreateParameter();
        p.ParameterName = name;
        p.Value = value ?? DBNull.Value;
        cmd.Parameters.Add(p);
    }

    private int GetCompanyIdOrThrow()
    {
        var raw = User.FindFirstValue("companyId");
        if (!int.TryParse(raw, out var companyId))
            throw new UnauthorizedAccessException("Missing companyId claim.");
        return companyId;
    }
}

public sealed class TrialBalanceResponseDto
{
    public List<TrialBalanceRowDto> rows { get; set; } = [];
    public bool hasUnpostedInPeriod { get; set; }
    public string? dateFrom { get; set; }
    public string? dateTo { get; set; }
    public bool postedOnly { get; set; }
}

public sealed class TrialBalanceRowDto
{
    public int glCaid { get; set; }
    public string glCode { get; set; } = "";
    public string glTitle { get; set; } = "";
    public int level { get; set; }
    public int isParent { get; set; }
    public int glNature { get; set; }
    public int glLevel { get; set; }
    /// <summary>GL account type (FK to GlAccountTypes / GLType on chart row).</summary>
    public int? glType { get; set; }
    public decimal openingBalance { get; set; }
    public decimal periodDr { get; set; }
    public decimal periodCr { get; set; }
    public decimal endBalance { get; set; }
}

public sealed class GeneralLedgerLinesResponseDto
{
    public int glCaid { get; set; }
    public decimal openingBalance { get; set; }
    public List<GeneralLedgerLineDto> lines { get; set; } = [];
}

public sealed class GeneralLedgerLineDto
{
    public int vDetailId { get; set; }
    public int vId { get; set; }
    public string voucherTypeTitle { get; set; } = "";
    public string voucherNo { get; set; } = "";
    public string vDate { get; set; } = "";
    public string? enteredAt { get; set; }
    public string narration { get; set; } = "";
    public decimal debit { get; set; }
    public decimal credit { get; set; }
    public decimal runningBalance { get; set; }
    public int? schemeId { get; set; }
    public string? schemeName { get; set; }
    public string? schemeShortCode { get; set; }
    public string? partnerName { get; set; }
    public string? prNumber { get; set; }
}
