using System.Collections.Generic;
using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using FbrSmartApp.Api.Auth;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using FbrSmartApp.Api.Services;
using FbrSmartApp.Api.Services.RecordRules;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/glChartAccounts")]
[Authorize]
public sealed class GlChartOfAccountsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly RecordRulesService _recordRules;

    public GlChartOfAccountsController(AppDbContext db, RecordRulesService recordRules)
    {
        _db = db;
        _recordRules = recordRules;
    }

    [HttpGet]
    [HasPermission("accounting.glChartAccounts.read")]
    public async Task<IActionResult> GetList(
        [FromQuery] string? sort,
        [FromQuery] string? range,
        [FromQuery] string? filter,
        CancellationToken ct)
    {
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var query = _db.GlChartOfAccounts.AsNoTracking()
            .Where(x => x.CompanyId == companyId);
        query = await _recordRules.ApplyReadFilterAsync(query, user, "accounting", "glChartAccounts", ct);

        if (!string.IsNullOrWhiteSpace(filter))
        {
            try
            {
                using var doc = JsonDocument.Parse(filter);
                if (doc.RootElement.TryGetProperty("q", out var qEl))
                {
                    var q = qEl.GetString();
                    if (!string.IsNullOrWhiteSpace(q))
                    {
                        var t = q.Trim();
                        query = query.Where(x =>
                            (x.GlCode != null && x.GlCode.Contains(t)) ||
                            (x.GlTitle != null && x.GlTitle.Contains(t)));
                    }
                }

                List<int>? glTypeIds = null;
                if (doc.RootElement.TryGetProperty("glTypeIds", out var gta) &&
                    gta.ValueKind == JsonValueKind.Array)
                {
                    foreach (var el in gta.EnumerateArray())
                    {
                        if (el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out var tid))
                        {
                            glTypeIds ??= new List<int>();
                            glTypeIds.Add(tid);
                        }
                    }
                }

                if (glTypeIds is { Count: > 0 })
                    query = query.Where(x => x.GlType != null && glTypeIds.Contains(x.GlType.Value));
            }
            catch (JsonException)
            {
                // ignore bad filter
            }
        }

        query = ApplySort(query, sort);

        var total = await query.CountAsync(ct);

        var from = 0;
        var to = Math.Min(24, Math.Max(total - 1, 0));
        if (!string.IsNullOrWhiteSpace(range))
        {
            try
            {
                var arr = JsonSerializer.Deserialize<int[]>(range);
                if (arr is { Length: >= 2 })
                {
                    from = Math.Max(0, arr[0]);
                    to = Math.Max(from, arr[1]);
                }
            }
            catch (JsonException)
            {
                // defaults
            }
        }

        var take = Math.Min(to - from + 1, 1000);
        var rows = await query.Skip(from).Take(take).ToListAsync(ct);

        var typeIds = rows.Select(x => x.GlType).Where(x => x != null).Select(x => x!.Value).Distinct().ToList();
        var typeTitles = typeIds.Count == 0
            ? new Dictionary<int, string?>()
            : await _db.GlAccountTypes.AsNoTracking()
                .Where(t => typeIds.Contains(t.Id))
                .ToDictionaryAsync(t => t.Id, t => t.Title, ct);

        var companyIds = rows.Select(x => x.CompanyId).Where(x => x != null).Select(x => x!.Value).Distinct().ToList();
        var companyTitles = companyIds.Count == 0
            ? new Dictionary<int, string?>()
            : await _db.Companies.AsNoTracking()
                .Where(c => companyIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => (string?)c.Title, ct);

        var dtos = rows.Select(x => new GlChartAccountListDto
        {
            id = x.Id,
            glCode = x.GlCode,
            glTitle = x.GlTitle,
            glType = x.GlType,
            glNature = x.GlNature,
            typeLabel = ResolveTypeLabel(x.GlType, x.GlNature, typeTitles),
            allowReconciliation = x.AllowReconciliation,
            accountCurrency = x.AccountCurrency,
            readOnly = x.ReadOnly,
            companyTitle = x.CompanyId is int cid && companyTitles.TryGetValue(cid, out var ctit) ? ctit : null,
        }).ToList();

        Response.Headers["Content-Range"] =
            $"glChartAccounts {from}-{from + Math.Max(dtos.Count - 1, 0)}/{total}";
        return Ok(dtos);
    }

    [HttpGet("export")]
    [HasPermission("accounting.glChartAccounts.read")]
    public async Task<IActionResult> ExportCsv(CancellationToken ct)
    {
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var exportQuery = _db.GlChartOfAccounts.AsNoTracking()
            .Where(x => x.CompanyId == companyId);
        exportQuery = await _recordRules.ApplyReadFilterAsync(exportQuery, user, "accounting", "glChartAccounts", ct);
        var rows = await exportQuery
            .OrderBy(x => x.GlCode ?? "").ThenBy(x => x.Id)
            .ToListAsync(ct);

        var typeIds = rows.Select(x => x.GlType).Where(x => x != null).Select(x => x!.Value).Distinct().ToList();
        var typeTitles = typeIds.Count == 0
            ? new Dictionary<int, string?>()
            : await _db.GlAccountTypes.AsNoTracking()
                .Where(t => typeIds.Contains(t.Id))
                .ToDictionaryAsync(t => t.Id, t => t.Title, ct);

        var companyTitle = await _db.Companies.AsNoTracking()
            .Where(c => c.Id == companyId)
            .Select(c => c.Title)
            .FirstOrDefaultAsync(ct) ?? "";

        var sb = new StringBuilder();
        sb.AppendLine(
            "Code,AccountName,AccountTypeId,AccountTypeTitle,AllowReconciliation,AccountCurrency,ReadOnly,Company");
        foreach (var x in rows)
        {
            var tt = x.GlType is int tid && typeTitles.TryGetValue(tid, out var tti) ? tti : "";
            sb.Append(CsvEscape(x.GlCode)).Append(',');
            sb.Append(CsvEscape(x.GlTitle)).Append(',');
            sb.Append(x.GlType?.ToString(CultureInfo.InvariantCulture) ?? "").Append(',');
            sb.Append(CsvEscape(tt)).Append(',');
            sb.Append(x.AllowReconciliation ? "TRUE" : "FALSE").Append(',');
            sb.Append(CsvEscape(x.AccountCurrency)).Append(',');
            sb.Append(x.ReadOnly ? "TRUE" : "FALSE").Append(',');
            sb.AppendLine(CsvEscape(companyTitle));
        }

        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        var fileName = $"ChartOfAccounts_{companyId}_{DateTime.UtcNow:yyyyMMdd}.csv";
        return File(bytes, "text/csv; charset=utf-8", fileName);
    }

    [HttpGet("import/template")]
    [HasPermission("accounting.glChartAccounts.read")]
    public async Task<IActionResult> GetImportTemplateCsv(CancellationToken cancellationToken = default)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user is null) return Unauthorized();

        const string body =
            "Code,AccountName,AccountTypeId,AccountTypeTitle,AllowReconciliation,AccountCurrency,ReadOnly,Company\r\n" +
            "110,Cash,10,Current Assets,FALSE,,FALSE,\r\n" +
            "120,Bank,9,Bank and Cash,FALSE,PKR,FALSE,\r\n";
        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(body)).ToArray();
        return File(bytes, "text/csv; charset=utf-8", "ChartOfAccounts_Import_Template.csv");
    }

    [HttpPost("import")]
    [RequestSizeLimit(12_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 12_000_000)]
    [HasPermission("accounting.glChartAccounts.write")]
    public async Task<IActionResult> ImportFile(IFormFile? file, CancellationToken ct)
    {
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });

        var currentCompanyId = GetCompanyIdOrThrow();

        await using var stream = file.OpenReadStream();
        var parsed = await GlChartOfAccountsFlexibleImport.ParseAsync(stream, file.FileName, ct);
        if (parsed.FatalError is not null)
            return BadRequest(new { message = parsed.FatalError });

        if (parsed.DataRows.Count > GlChartOfAccountsFlexibleImport.MaxDataRows)
        {
            return BadRequest(new
            {
                message = $"Too many data rows (max {GlChartOfAccountsFlexibleImport.MaxDataRows}).",
            });
        }

        var companyRows = await _db.Companies.AsNoTracking().Select(c => new { c.Id, c.Title }).ToListAsync(ct);
        var companyIdByExactTitle = companyRows
            .GroupBy(x => x.Title, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.First().Id, StringComparer.Ordinal);

        var col = parsed.Columns;
        var types = await _db.GlAccountTypes.AsNoTracking().ToListAsync(ct);
        var parentIds = new HashSet<int>(types.Where(t => t.MainParentId != null).Select(t => t.MainParentId!.Value));
        var leafByTitle = types
            .Where(t => !parentIds.Contains(t.Id))
            .GroupBy(t => (t.Title ?? "").Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().Id, StringComparer.OrdinalIgnoreCase);
        var leafIds = new HashSet<int>(types.Where(t => !parentIds.Contains(t.Id)).Select(t => t.Id));

        var created = 0;
        var updated = 0;
        var skipped = 0;
        var errors = new List<string>();
        const int maxErrors = 40;

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            foreach (var row in parsed.DataRows)
            {
                if (errors.Count >= maxErrors)
                    break;

                var lineLabel = $"Row {row.LineNumber}";

                if (string.IsNullOrWhiteSpace(row.Code) && string.IsNullOrWhiteSpace(row.AccountName))
                    continue;

                if (string.IsNullOrWhiteSpace(row.Code))
                {
                    skipped++;
                    if (errors.Count < maxErrors)
                        errors.Add($"{lineLabel}: Account code is required when a title is present.");
                    continue;
                }

                if (string.IsNullOrWhiteSpace(row.AccountName))
                {
                    skipped++;
                    if (errors.Count < maxErrors)
                        errors.Add($"{lineLabel}: Account title is required.");
                    continue;
                }

                var codeKey = row.Code.Trim();

                int? glType = null;
                if (row.AccountTypeId is int tid)
                {
                    if (types.Any(t => t.MainParentId == tid))
                    {
                        skipped++;
                        errors.Add($"{lineLabel}: AccountTypeId {tid} is not a leaf type.");
                        continue;
                    }

                    if (!types.Any(t => t.Id == tid))
                    {
                        skipped++;
                        errors.Add($"{lineLabel}: Unknown AccountTypeId {tid}.");
                        continue;
                    }

                    glType = tid;
                }
                else if (!string.IsNullOrWhiteSpace(row.AccountTypeTitle))
                {
                    var key = row.AccountTypeTitle.Trim();
                    if (!leafByTitle.TryGetValue(key, out var leafId))
                    {
                        skipped++;
                        errors.Add($"{lineLabel}: Unknown AccountTypeTitle \"{key}\".");
                        continue;
                    }

                    glType = leafId;
                }

                if (glType == null)
                    glType = GlChartOfAccountsFlexibleImport.InferAccountTypeId(row.AccountName.Trim(), leafIds);

                var allowRec = col.AllowReconciliation >= 0 ? (row.AllowReconciliation ?? false) : false;
                var readOnly = col.ReadOnly >= 0 ? (row.ReadOnly ?? false) : false;
                var currency = col.AccountCurrency >= 0
                    ? (string.IsNullOrWhiteSpace(row.AccountCurrency) ? null : row.AccountCurrency.Trim())
                    : null;

                var targetCompanies = GlChartOfAccountsFlexibleImport.ResolveTargetCompanyIds(
                    row.CompanyNamesRaw,
                    currentCompanyId,
                    companyIdByExactTitle,
                    errors,
                    lineLabel,
                    maxErrors);

                if (targetCompanies.Count == 0)
                {
                    skipped++;
                    continue;
                }

                foreach (var cid in targetCompanies)
                {
                    if (!GlChartOfAccountsFlexibleImport.UserMayWriteChartForCompany(user, cid, currentCompanyId))
                    {
                        if (errors.Count < maxErrors)
                        {
                            errors.Add(
                                $"{lineLabel}: No permission to import chart lines for this company (id {cid}).");
                        }

                        skipped++;
                        continue;
                    }

                    var entity = await _db.GlChartOfAccounts
                        .FirstOrDefaultAsync(x => x.CompanyId == cid && x.GlCode == codeKey, ct);

                    if (entity is null)
                    {
                        _db.GlChartOfAccounts.Add(new GlChartOfAccount
                        {
                            GlCode = codeKey,
                            GlTitle = row.AccountName.Trim(),
                            GlType = glType,
                            CompanyId = cid,
                            Status = true,
                            ReadOnly = readOnly,
                            AllowReconciliation = allowRec,
                            AccountCurrency = currency,
                            AccountLevelOne = "1",
                        });
                        created++;
                    }
                    else
                    {
                        if (entity.ReadOnly)
                        {
                            skipped++;
                            if (errors.Count < maxErrors)
                            {
                                errors.Add(
                                    $"{lineLabel}: Account \"{codeKey}\" (company id {cid}) is read-only; skipped.");
                            }

                            continue;
                        }

                        entity.GlTitle = row.AccountName.Trim();
                        if (glType != null)
                            entity.GlType = glType;
                        if (col.AllowReconciliation >= 0)
                            entity.AllowReconciliation = row.AllowReconciliation ?? false;
                        if (col.AccountCurrency >= 0)
                            entity.AccountCurrency = currency;
                        if (col.ReadOnly >= 0)
                            entity.ReadOnly = row.ReadOnly ?? false;
                        updated++;
                    }
                }
            }

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            return BadRequest(new { message = $"Import failed: {ex.Message}" });
        }

        return Ok(new GlChartAccountImportResponse
        {
            created = created,
            updated = updated,
            skipped = skipped,
            errors = errors,
        });
    }

    private static string CsvEscape(string? value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        if (value.Contains('"', StringComparison.Ordinal) ||
            value.Contains(',', StringComparison.Ordinal) ||
            value.Contains('\r', StringComparison.Ordinal) ||
            value.Contains('\n', StringComparison.Ordinal))
            return "\"" + value.Replace("\"", "\"\"", StringComparison.Ordinal) + "\"";
        return value;
    }

    [HttpGet("{id:int}")]
    [HasPermission("accounting.glChartAccounts.read")]
    public async Task<IActionResult> GetOne(int id, CancellationToken ct)
    {
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var x = await _db.GlChartOfAccounts.AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id && a.CompanyId == companyId, ct);
        if (x is null) return NotFound();

        if (!await _recordRules.SatisfiesReadAsync(x, user, "accounting", "glChartAccounts", ct))
            return Forbid();

        return Ok(await BuildDetailDtoAsync(x, user, companyId, ct));
    }

    /// <summary>Create chart-of-accounts line(s); optional multi-company mapping via <c>companyIds</c> + <c>mappingCodes</c>.</summary>
    [HttpPost]
    [HasPermission("accounting.glChartAccounts.create")]
    public async Task<IActionResult> Create([FromBody] JsonElement body, CancellationToken ct)
    {
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();

        if (body.ValueKind != JsonValueKind.Object)
            return BadRequest(new { message = "Invalid JSON body." });

        if (!body.TryGetProperty("glCode", out var glCodeEl) || glCodeEl.ValueKind != JsonValueKind.String)
            return BadRequest(new { message = "Code is required." });
        var defaultCode = (glCodeEl.GetString() ?? "").Trim();
        if (string.IsNullOrEmpty(defaultCode))
            return BadRequest(new { message = "Code is required." });

        if (!body.TryGetProperty("glTitle", out var glTitleEl) || glTitleEl.ValueKind != JsonValueKind.String)
            return BadRequest(new { message = "Account name is required." });
        var title = (glTitleEl.GetString() ?? "").Trim();
        if (string.IsNullOrEmpty(title))
            return BadRequest(new { message = "Account name is required." });

        if (!body.TryGetProperty("glType", out var glTypeEl) || glTypeEl.ValueKind != JsonValueKind.Number ||
            !glTypeEl.TryGetInt32(out var glType))
            return BadRequest(new { message = "Account type is required." });

        var hasChildren = await _db.GlAccountTypes.AnyAsync(t => t.MainParentId == glType, ct);
        if (hasChildren)
            return BadRequest(new { message = "Choose a leaf account type (not a group header)." });

        var typeExists = await _db.GlAccountTypes.AnyAsync(t => t.Id == glType, ct);
        if (!typeExists)
            return BadRequest(new { message = "Unknown account type." });

        var allowRec = false;
        if (body.TryGetProperty("allowReconciliation", out var recEl) &&
            recEl.ValueKind is JsonValueKind.True or JsonValueKind.False)
            allowRec = recEl.GetBoolean();

        string? currency = null;
        if (body.TryGetProperty("accountCurrency", out var curEl) && curEl.ValueKind == JsonValueKind.String)
        {
            var s = curEl.GetString()?.Trim();
            currency = string.IsNullOrEmpty(s) ? null : s;
        }

        var mapping = ParseMappingCodes(body);
        var targetCompanies = ParseCompanyIdsArray(body);
        if (targetCompanies.Count == 0)
            targetCompanies = InferCompanyIdsFromMapping(body, companyId);
        if (targetCompanies.Count == 0)
            targetCompanies = new List<int> { companyId };
        if (!targetCompanies.Contains(companyId))
            targetCompanies.Insert(0, companyId);
        targetCompanies = targetCompanies.Distinct().OrderBy(c => c).ToList();

        foreach (var cid in targetCompanies)
        {
            if (!GlChartOfAccountsFlexibleImport.UserMayWriteChartForCompany(user, cid, companyId))
            {
                return BadRequest(new
                {
                    message = $"You may not create chart accounts for company {cid}.",
                });
            }
        }

        foreach (var cid in targetCompanies)
        {
            var codeFor = ResolveCodeForCompany(cid, defaultCode, mapping);
            if (string.IsNullOrWhiteSpace(codeFor))
                return BadRequest(new { message = $"Code is required for company {cid}." });
            var dupMsg = await GetDuplicateCodeMessageAsync(cid, codeFor, null, ct);
            if (dupMsg is not null)
                return BadRequest(new { message = dupMsg });
        }

        var groupKey = Guid.NewGuid().ToString();
        GlChartOfAccount? primary = null;

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            foreach (var cid in targetCompanies)
            {
                var codeFor = ResolveCodeForCompany(cid, defaultCode, mapping);
                var entity = new GlChartOfAccount
                {
                    GlCode = codeFor,
                    GlTitle = title,
                    GlType = glType,
                    CompanyId = cid,
                    Status = true,
                    ReadOnly = false,
                    AllowReconciliation = allowRec,
                    AccountCurrency = currency,
                    AccountLevelOne = "1",
                    ChartAccountGroupKey = groupKey,
                };
                if (!await _recordRules.SatisfiesCreateAsync(entity, user, "accounting", "glChartAccounts", ct))
                {
                    await tx.RollbackAsync(ct);
                    return Forbid();
                }

                _db.GlChartOfAccounts.Add(entity);
                if (cid == companyId)
                    primary = entity;
            }

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            return BadRequest(new { message = $"Save failed: {ex.Message}" });
        }

        if (primary is null)
            return BadRequest(new { message = "Could not create row for current company." });

        return Ok(await BuildDetailDtoAsync(primary, user, companyId, ct));
    }

    [HttpPatch("{id:int}")]
    [HasPermission("accounting.glChartAccounts.write")]
    public Task<IActionResult> Patch(int id, [FromBody] JsonElement body, CancellationToken ct)
        => ApplyAccountUpdateAsync(id, body, ct);

    [HttpPut("{id:int}")]
    [HasPermission("accounting.glChartAccounts.write")]
    public Task<IActionResult> Put(int id, [FromBody] JsonElement body, CancellationToken ct)
        => ApplyAccountUpdateAsync(id, body, ct);

    private async Task<IActionResult> ApplyAccountUpdateAsync(int id, JsonElement body, CancellationToken ct)
    {
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var entity = await _db.GlChartOfAccounts
            .FirstOrDefaultAsync(a => a.Id == id && a.CompanyId == companyId, ct);
        if (entity is null) return NotFound();

        if (!await _recordRules.SatisfiesWriteAsync(entity, user, "accounting", "glChartAccounts", ct))
            return Forbid();

        if (body.ValueKind != JsonValueKind.Object)
            return BadRequest(new { message = "Invalid JSON body." });

        var wantsSync = BodyRequestsChartGroupSync(body);

        var anyMutation =
            body.TryGetProperty("glCode", out _) ||
            body.TryGetProperty("glTitle", out _) ||
            body.TryGetProperty("glType", out _) ||
            body.TryGetProperty("accountCurrency", out _) ||
            body.TryGetProperty("allowReconciliation", out _) ||
            wantsSync;

        if (entity.ReadOnly && anyMutation)
            return BadRequest(new { message = "This account is read-only." });

        if (body.TryGetProperty("glCode", out var glCodeEl))
        {
            if (glCodeEl.ValueKind == JsonValueKind.String)
                entity.GlCode = glCodeEl.GetString();
            else if (glCodeEl.ValueKind == JsonValueKind.Null)
                entity.GlCode = null;
        }

        if (body.TryGetProperty("glTitle", out var glTitleEl))
        {
            if (glTitleEl.ValueKind == JsonValueKind.String)
                entity.GlTitle = glTitleEl.GetString();
            else if (glTitleEl.ValueKind == JsonValueKind.Null)
                entity.GlTitle = null;
        }

        if (body.TryGetProperty("accountCurrency", out var curEl))
        {
            if (curEl.ValueKind == JsonValueKind.String)
            {
                var s = curEl.GetString()?.Trim();
                entity.AccountCurrency = string.IsNullOrEmpty(s) ? null : s;
            }
            else if (curEl.ValueKind == JsonValueKind.Null)
                entity.AccountCurrency = null;
        }

        if (body.TryGetProperty("allowReconciliation", out var recEl))
        {
            if (recEl.ValueKind is JsonValueKind.True or JsonValueKind.False)
                entity.AllowReconciliation = recEl.GetBoolean();
        }

        if (body.TryGetProperty("glType", out var glTypeEl))
        {
            if (glTypeEl.ValueKind == JsonValueKind.Null)
                entity.GlType = null;
            else if (glTypeEl.ValueKind == JsonValueKind.Number && glTypeEl.TryGetInt32(out var gt))
            {
                var hasChildren = await _db.GlAccountTypes.AnyAsync(t => t.MainParentId == gt, ct);
                if (hasChildren)
                    return BadRequest(new { message = "Choose a leaf account type (not a group header)." });

                var exists = await _db.GlAccountTypes.AnyAsync(t => t.Id == gt, ct);
                if (!exists)
                    return BadRequest(new { message = "Unknown account type." });

                entity.GlType = gt;
            }
        }

        if (wantsSync)
        {
            var syncErr = await SyncChartAccountGroupAsync(entity, body, user, companyId, ct);
            if (syncErr is not null)
                return syncErr;
        }
        else if (body.TryGetProperty("glCode", out _) && entity.GlCode is string codeStr && !string.IsNullOrEmpty(codeStr))
        {
            var dupMsg = await GetDuplicateCodeMessageAsync(companyId, codeStr, entity.Id, ct);
            if (dupMsg is not null)
                return BadRequest(new { message = dupMsg });
        }

        await _db.SaveChangesAsync(ct);

        return Ok(await BuildDetailDtoAsync(entity, user, companyId, ct));
    }

    private async Task<IActionResult?> SyncChartAccountGroupAsync(
        GlChartOfAccount entity,
        JsonElement body,
        User user,
        int currentCompanyId,
        CancellationToken ct)
    {
        var mapping = ParseMappingCodes(body);
        var targetCompanies = ParseCompanyIdsArray(body);
        if (targetCompanies.Count == 0)
            targetCompanies = InferCompanyIdsFromMapping(body, currentCompanyId);
        if (targetCompanies.Count == 0)
            targetCompanies = new List<int> { currentCompanyId };
        if (!targetCompanies.Contains(currentCompanyId))
            targetCompanies.Insert(0, currentCompanyId);
        targetCompanies = targetCompanies.Distinct().OrderBy(c => c).ToList();

        var defaultCode = (entity.GlCode ?? "").Trim();
        if (string.IsNullOrEmpty(defaultCode))
            return BadRequest(new { message = "Code is required." });

        foreach (var cid in targetCompanies)
        {
            if (!GlChartOfAccountsFlexibleImport.UserMayWriteChartForCompany(user, cid, currentCompanyId))
            {
                return BadRequest(new
                {
                    message = $"You may not update chart accounts for company {cid}.",
                });
            }
        }

        if (string.IsNullOrEmpty(entity.ChartAccountGroupKey))
            entity.ChartAccountGroupKey = Guid.NewGuid().ToString();

        var groupKey = entity.ChartAccountGroupKey!;
        var tracked = await _db.GlChartOfAccounts
            .Where(a => a.ChartAccountGroupKey == groupKey)
            .ToListAsync(ct);
        if (tracked.All(t => t.Id != entity.Id))
            tracked.Add(entity);

        foreach (var cid in targetCompanies)
        {
            var codeFor = ResolveCodeForCompany(cid, defaultCode, mapping);
            if (string.IsNullOrWhiteSpace(codeFor))
                return BadRequest(new { message = $"Code is required for company {cid}." });

            var row = tracked.FirstOrDefault(t => t.CompanyId == cid);
            if (row is null)
            {
                var dupNew = await GetDuplicateCodeMessageAsync(cid, codeFor, null, ct);
                if (dupNew is not null)
                    return BadRequest(new { message = dupNew });

                var clone = new GlChartOfAccount
                {
                    GlCode = codeFor,
                    GlTitle = entity.GlTitle,
                    GlType = entity.GlType,
                    CompanyId = cid,
                    Status = true,
                    ReadOnly = false,
                    AllowReconciliation = entity.AllowReconciliation,
                    AccountCurrency = entity.AccountCurrency,
                    AccountLevelOne = string.IsNullOrEmpty(entity.AccountLevelOne) ? "1" : entity.AccountLevelOne,
                    ChartAccountGroupKey = groupKey,
                    GlNature = entity.GlNature,
                };
                _db.GlChartOfAccounts.Add(clone);
                tracked.Add(clone);
            }
            else
            {
                var dupUp = await GetDuplicateCodeMessageAsync(cid, codeFor, row.Id, ct);
                if (dupUp is not null)
                    return BadRequest(new { message = dupUp });
                row.GlCode = codeFor;
            }
        }

        foreach (var row in tracked)
        {
            if (row.CompanyId is int ocId && !targetCompanies.Contains(ocId))
                row.ChartAccountGroupKey = null;
        }

        var groupRows = await _db.GlChartOfAccounts
            .Where(a => a.ChartAccountGroupKey == groupKey)
            .ToListAsync(ct);
        foreach (var row in groupRows)
        {
            row.GlTitle = entity.GlTitle;
            row.GlType = entity.GlType;
            row.AllowReconciliation = entity.AllowReconciliation;
            row.AccountCurrency = entity.AccountCurrency;
            row.GlNature = entity.GlNature;
        }

        return null;
    }

    private async Task<GlChartAccountListDto> BuildDetailDtoAsync(
        GlChartOfAccount x,
        User user,
        int currentCompanyId,
        CancellationToken ct)
    {
        var siblings = await LoadSiblingRowsAsync(x, user, currentCompanyId, ct);

        var typeTitle = x.GlType is int tid
            ? await _db.GlAccountTypes.AsNoTracking()
                .Where(t => t.Id == tid)
                .Select(t => t.Title)
                .FirstOrDefaultAsync(ct)
            : null;

        var companyTitle = x.CompanyId is int cid
            ? await _db.Companies.AsNoTracking()
                .Where(c => c.Id == cid)
                .Select(c => c.Title)
                .FirstOrDefaultAsync(ct)
            : null;

        var companyIds = siblings
            .Select(s => s.CompanyId)
            .Where(c => c != null)
            .Select(c => c!.Value)
            .Distinct()
            .OrderBy(c => c)
            .ToList();

        var mappingCodes = new Dictionary<string, string>();
        foreach (var s in siblings)
        {
            if (s.CompanyId is int cid2 && !string.IsNullOrEmpty(s.GlCode))
                mappingCodes[cid2.ToString()] = s.GlCode!;
        }

        return new GlChartAccountListDto
        {
            id = x.Id,
            glCode = x.GlCode,
            glTitle = x.GlTitle,
            glType = x.GlType,
            glNature = x.GlNature,
            typeLabel = ResolveTypeLabel(x.GlType, x.GlNature, typeTitle),
            allowReconciliation = x.AllowReconciliation,
            accountCurrency = x.AccountCurrency,
            readOnly = x.ReadOnly,
            companyTitle = companyTitle,
            companyIds = companyIds,
            mappingCodes = mappingCodes,
            chartAccountGroupKey = x.ChartAccountGroupKey,
        };
    }

    private async Task<List<GlChartOfAccount>> LoadSiblingRowsAsync(
        GlChartOfAccount anchor,
        User user,
        int currentCompanyId,
        CancellationToken ct)
    {
        if (string.IsNullOrEmpty(anchor.ChartAccountGroupKey))
            return new List<GlChartOfAccount> { anchor };

        var q = _db.GlChartOfAccounts.AsNoTracking()
            .Where(a => a.ChartAccountGroupKey == anchor.ChartAccountGroupKey);

        if (!string.Equals(user.Role, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            var allowed = new HashSet<int> { currentCompanyId };
            try
            {
                var ids = JsonSerializer.Deserialize<List<int>>(user.AllowedCompanyIdsJson ?? "[]");
                if (ids != null)
                {
                    foreach (var i in ids)
                        allowed.Add(i);
                }
            }
            catch (JsonException)
            {
                // ignore
            }

            q = q.Where(a => a.CompanyId != null && allowed.Contains(a.CompanyId.Value));
        }

        return await q.OrderBy(a => a.CompanyId).ToListAsync(ct);
    }

    /// <summary>True when the client sent a non-empty multi-company payload (not just empty arrays/objects from transforms).</summary>
    private static bool BodyRequestsChartGroupSync(JsonElement body)
    {
        if (body.TryGetProperty("companyIds", out var cEl) && cEl.ValueKind == JsonValueKind.Array &&
            cEl.GetArrayLength() > 0)
            return true;
        if (body.TryGetProperty("mappingCodes", out var mEl) && mEl.ValueKind == JsonValueKind.Object)
        {
            foreach (var _ in mEl.EnumerateObject())
                return true;
        }

        return false;
    }

    private static List<int> ParseCompanyIdsArray(JsonElement body)
    {
        var list = new List<int>();
        if (!body.TryGetProperty("companyIds", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return list;
        foreach (var el in arr.EnumerateArray())
        {
            if (el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out var id))
                list.Add(id);
        }

        return list.Distinct().ToList();
    }

    private static Dictionary<int, string> ParseMappingCodes(JsonElement body)
    {
        var map = new Dictionary<int, string>();
        if (!body.TryGetProperty("mappingCodes", out var mcEl) || mcEl.ValueKind != JsonValueKind.Object)
            return map;
        foreach (var p in mcEl.EnumerateObject())
        {
            if (!int.TryParse(p.Name, out var cid))
                continue;
            if (p.Value.ValueKind == JsonValueKind.String)
            {
                var s = (p.Value.GetString() ?? "").Trim();
                if (!string.IsNullOrEmpty(s))
                    map[cid] = s;
            }
        }

        return map;
    }

    private static List<int> InferCompanyIdsFromMapping(JsonElement body, int currentCompanyId)
    {
        var list = new List<int>();
        if (!body.TryGetProperty("mappingCodes", out var mc) || mc.ValueKind != JsonValueKind.Object)
            return list;
        foreach (var p in mc.EnumerateObject())
        {
            if (int.TryParse(p.Name, out var cid))
                list.Add(cid);
        }

        if (!list.Contains(currentCompanyId))
            list.Insert(0, currentCompanyId);
        return list.Distinct().ToList();
    }

    private static string ResolveCodeForCompany(
        int companyId,
        string defaultCode,
        IReadOnlyDictionary<int, string> mapping)
    {
        if (mapping.TryGetValue(companyId, out var v) && !string.IsNullOrWhiteSpace(v))
            return v.Trim();
        return defaultCode;
    }

    private async Task<string?> GetDuplicateCodeMessageAsync(int companyId, string code, int? excludeGlcaId, CancellationToken ct)
    {
        var dup = await _db.GlChartOfAccounts.AsNoTracking()
            .AnyAsync(
                x => x.CompanyId == companyId &&
                     x.GlCode == code &&
                     (excludeGlcaId == null || x.Id != excludeGlcaId),
                ct);
        if (!dup)
            return null;
        var name = await _db.Companies.AsNoTracking()
            .Where(c => c.Id == companyId)
            .Select(c => c.Title)
            .FirstOrDefaultAsync(ct);
        return $"Duplicate code: an account with code \"{code}\" already exists for company \"{name ?? companyId.ToString()}\".";
    }

    private static IQueryable<GlChartOfAccount> ApplySort(IQueryable<GlChartOfAccount> query, string? sort)
    {
        if (string.IsNullOrWhiteSpace(sort))
            return query.OrderBy(x => x.GlCode ?? "").ThenBy(x => x.Id);

        try
        {
            var arr = JsonSerializer.Deserialize<string[]>(sort);
            if (arr is not { Length: >= 2 }) return query.OrderBy(x => x.GlCode ?? "").ThenBy(x => x.Id);

            var field = (arr[0] ?? "").Trim();
            var desc = string.Equals(arr[1], "DESC", StringComparison.OrdinalIgnoreCase);

            if (field.Equals("GLCode", StringComparison.OrdinalIgnoreCase) ||
                field.Equals("glCode", StringComparison.OrdinalIgnoreCase))
            {
                return desc
                    ? query.OrderByDescending(x => x.GlCode ?? "").ThenByDescending(x => x.Id)
                    : query.OrderBy(x => x.GlCode ?? "").ThenBy(x => x.Id);
            }

            if (field.Equals("GLTitle", StringComparison.OrdinalIgnoreCase) ||
                field.Equals("glTitle", StringComparison.OrdinalIgnoreCase))
            {
                return desc
                    ? query.OrderByDescending(x => x.GlTitle ?? "").ThenByDescending(x => x.Id)
                    : query.OrderBy(x => x.GlTitle ?? "").ThenBy(x => x.Id);
            }
        }
        catch (JsonException)
        {
            // fall through
        }

        return query.OrderBy(x => x.GlCode ?? "").ThenBy(x => x.Id);
    }

    private static string? ResolveTypeLabel(int? glType, byte? glNature, IReadOnlyDictionary<int, string?> typeTitles)
    {
        if (glType is int tid && typeTitles.TryGetValue(tid, out var title) && !string.IsNullOrWhiteSpace(title))
            return title;
        return LegacyTypeLabel(glType, glNature);
    }

    private static string? ResolveTypeLabel(int? glType, byte? glNature, string? typeTitle)
    {
        if (!string.IsNullOrWhiteSpace(typeTitle))
            return typeTitle;
        return LegacyTypeLabel(glType, glNature);
    }

    private static string? LegacyTypeLabel(int? glType, byte? glNature)
    {
        if (glType is null && glNature is null) return null;
        if (glType is not null && glNature is not null) return $"{glType} / {glNature}";
        return glType?.ToString() ?? glNature?.ToString();
    }

    private async Task<User?> GetCurrentUserAsync(CancellationToken ct)
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        return await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
    }

    private int GetCompanyIdOrThrow()
    {
        var raw = User.FindFirstValue("companyId");
        if (!int.TryParse(raw, out var companyId))
            throw new UnauthorizedAccessException("Missing companyId claim.");
        return companyId;
    }

    public sealed class GlChartAccountListDto
    {
        public int id { get; set; }
        public string? glCode { get; set; }
        public string? glTitle { get; set; }
        public int? glType { get; set; }
        public byte? glNature { get; set; }
        public string? typeLabel { get; set; }
        public bool allowReconciliation { get; set; }
        public string? accountCurrency { get; set; }
        public bool readOnly { get; set; }
        public string? companyTitle { get; set; }
        public List<int>? companyIds { get; set; }
        public Dictionary<string, string>? mappingCodes { get; set; }
        public string? chartAccountGroupKey { get; set; }
    }

    public sealed class GlChartAccountImportResponse
    {
        public int created { get; set; }
        public int updated { get; set; }
        public int skipped { get; set; }
        public List<string> errors { get; set; } = [];
    }
}
