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

        var sql = BuildTrialBalanceSql(schema);

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

    private static string BuildTrialBalanceSql(TrialBalanceSchemaFlags f)
    {
        var showParty = f.HasShowToParty ? "      AND ISNULL(d.ShowToParty, 0) = 0\n" : "";
        var vCancel = f.HasVCancel ? "      AND ISNULL(m.vCancel, 0) = 0\n" : "";
        var branch = f.HasBranchId ? "      AND (@BranchId IS NULL OR m.BranchID = @BranchId)\n" : "";
        var fiscal = f.HasFiscalId ? "      AND (@FiscalId IS NULL OR m.FiscalID = @FiscalId)\n" : "";

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
        ISNULL(a.GLLevel, 0) AS GLLevel
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
        ISNULL(a.GLLevel, 0)
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
    CAST(ISNULL(o.OpeningBalance, 0) AS DECIMAL(18,3)) AS OpeningBalance,
    CAST(ISNULL(p.PeriodDr, 0) AS DECIMAL(18,3)) AS PeriodDr,
    CAST(ISNULL(p.PeriodCr, 0) AS DECIMAL(18,3)) AS PeriodCr,
    CAST(ISNULL(o.OpeningBalance, 0) + ISNULL(p.PeriodDr, 0) - ISNULL(p.PeriodCr, 0) AS DECIMAL(18,3)) AS EndBalance
FROM ChartHierarchy h
LEFT JOIN Opening o ON o.GlAccountID = h.GLCAID
LEFT JOIN PeriodAgg p ON p.GlAccountID = h.GLCAID
ORDER BY TRY_CONVERT(DECIMAL(38, 0), LTRIM(RTRIM(CONVERT(NVARCHAR(100), h.GLCode)))), h.SortKey
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
    public decimal openingBalance { get; set; }
    public decimal periodDr { get; set; }
    public decimal periodCr { get; set; }
    public decimal endBalance { get; set; }
}
