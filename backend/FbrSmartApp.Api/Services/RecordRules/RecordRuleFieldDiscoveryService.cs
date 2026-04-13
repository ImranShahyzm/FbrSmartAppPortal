using System.Text.RegularExpressions;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Services.RecordRules;

/// <summary>
/// Loads ruleable fields (reflection + EF), optional developer visibility rows, and distinct column samples.
/// When no visibility rows exist for a model, only a heuristic subset is exposed (CompanyId, Status, FK *Id).
/// </summary>
public sealed class RecordRuleFieldDiscoveryService
{
    private const int MaxTake = 500;
    private static readonly Regex s_safeIdent = new("^[a-zA-Z_][a-zA-Z0-9_]*$", RegexOptions.Compiled);

    private readonly AppDbContext _db;

    public RecordRuleFieldDiscoveryService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>Fields shown in security group record-rules grid (filtered by heuristic or developer settings).</summary>
    public async Task<IReadOnlyList<RecordRuleFieldDto>> GetVisibleRuleableFieldsAsync(
        string permissionsPrefix,
        string modelKey,
        CancellationToken ct = default)
    {
        var all = GetAllRuleableFields(permissionsPrefix, modelKey);
        if (all.Count == 0) return Array.Empty<RecordRuleFieldDto>();

        var visible = await GetVisibleFieldNameSetAsync(permissionsPrefix, modelKey, ct);
        var list = new List<RecordRuleFieldDto>();
        foreach (var f in all)
        {
            if (visible.Contains(f.name))
                list.Add(f);
        }
        return list;
    }

    public async Task<bool> IsFieldVisibleForRecordRulesAsync(
        string permissionsPrefix,
        string modelKey,
        string fieldName,
        CancellationToken ct = default)
    {
        var f = (fieldName ?? "").Trim();
        if (f.Length == 0) return false;
        if (!RecordRuleModelRegistry.TryGetEntityType(permissionsPrefix, modelKey, out var clrType) || clrType is null)
            return false;
        if (!RecordRuleModelRegistry.IsRuleableField(clrType, f)) return false;

        var visible = await GetVisibleFieldNameSetAsync(permissionsPrefix, modelKey, ct);
        return visible.Contains(f);
    }

    public async Task<RecordRuleModelFieldSettingsGetDto> GetDeveloperFieldSettingsAsync(
        string permissionsPrefix,
        string modelKey,
        CancellationToken ct = default)
    {
        var prefix = (permissionsPrefix ?? "").Trim();
        var key = (modelKey ?? "").Trim();
        var all = GetAllRuleableFields(prefix, key);

        var rows = await _db.RecordRuleModelFieldSettings.AsNoTracking()
            .Where(x => x.PermissionsPrefix == prefix && x.ModelKey == key)
            .ToListAsync(ct);

        var fields = new List<RecordRuleModelFieldSettingRowDto>();
        foreach (var dto in all)
        {
            var suggested = IsHeuristicSuggestedField(dto.name);
            var row = rows.FirstOrDefault(r =>
                string.Equals(r.FieldName, dto.name, StringComparison.OrdinalIgnoreCase));
            bool enabled;
            if (rows.Count == 0)
                enabled = suggested;
            else
                enabled = row != null && row.IsEnabled;

            fields.Add(new RecordRuleModelFieldSettingRowDto
            {
                name = dto.name,
                valueKind = dto.valueKind,
                enabled = enabled,
                suggestedDefault = suggested,
            });
        }

        return new RecordRuleModelFieldSettingsGetDto
        {
            permissionsPrefix = prefix,
            modelKey = key,
            fields = fields,
        };
    }

    public async Task SaveDeveloperFieldSettingsAsync(
        string permissionsPrefix,
        string modelKey,
        IReadOnlyList<RecordRuleFieldToggleDto>? toggles,
        CancellationToken ct = default)
    {
        var prefix = (permissionsPrefix ?? "").Trim();
        var key = (modelKey ?? "").Trim();
        if (prefix.Length == 0 || key.Length == 0)
            throw new ArgumentException("permissionsPrefix and modelKey are required.");

        if (!RecordRuleModelRegistry.TryGetEntityType(prefix, key, out var clrType) || clrType is null)
            throw new InvalidOperationException("Unknown model for record rules.");

        var allowed = new HashSet<string>(
            RecordRuleModelRegistry.GetRuleablePropertyNames(clrType),
            StringComparer.OrdinalIgnoreCase);

        var list = toggles ?? Array.Empty<RecordRuleFieldToggleDto>();
        foreach (var t in list)
        {
            var fn = (t.fieldName ?? "").Trim();
            if (fn.Length == 0) continue;
            if (!allowed.Contains(fn))
                throw new InvalidOperationException($"Field '{fn}' is not a valid ruleable field for this model.");
        }

        var existing = await _db.RecordRuleModelFieldSettings
            .Where(x => x.PermissionsPrefix == prefix && x.ModelKey == key)
            .ToListAsync(ct);
        _db.RecordRuleModelFieldSettings.RemoveRange(existing);

        foreach (var t in list)
        {
            var fn = (t.fieldName ?? "").Trim();
            if (fn.Length == 0) continue;
            var canonical = RecordRuleModelRegistry.ResolveProperty(clrType, fn)?.Name ?? fn;
            _db.RecordRuleModelFieldSettings.Add(new RecordRuleModelFieldSetting
            {
                PermissionsPrefix = prefix,
                ModelKey = key,
                FieldName = canonical,
                IsEnabled = t.enabled,
            });
        }

        await _db.SaveChangesAsync(ct);
    }

    /// <summary>Remove saved toggles so the model falls back to heuristic defaults (CompanyId, Status, *Id, …).</summary>
    public async Task DeleteDeveloperFieldSettingsAsync(string permissionsPrefix, string modelKey, CancellationToken ct = default)
    {
        var prefix = (permissionsPrefix ?? "").Trim();
        var key = (modelKey ?? "").Trim();
        if (prefix.Length == 0 || key.Length == 0)
            throw new ArgumentException("permissionsPrefix and modelKey are required.");

        var existing = await _db.RecordRuleModelFieldSettings
            .Where(x => x.PermissionsPrefix == prefix && x.ModelKey == key)
            .ToListAsync(ct);
        if (existing.Count == 0) return;
        _db.RecordRuleModelFieldSettings.RemoveRange(existing);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<string>> GetDistinctValuesAsync(
        string permissionsPrefix,
        string modelKey,
        string fieldName,
        int companyId,
        int take,
        CancellationToken ct)
    {
        take = Math.Clamp(take, 1, MaxTake);
        if (!await IsFieldVisibleForRecordRulesAsync(permissionsPrefix, modelKey, fieldName, ct))
            return Array.Empty<string>();

        if (!RecordRuleModelRegistry.TryGetEntityType(permissionsPrefix, modelKey, out var clrType) || clrType is null)
            return Array.Empty<string>();

        if (!RecordRuleModelRegistry.IsRuleableField(clrType, fieldName))
            return Array.Empty<string>();

        var entityType = _db.Model.FindEntityType(clrType);
        if (entityType is null) return Array.Empty<string>();

        var valueProp = entityType.FindProperty(fieldName);
        if (valueProp is null) return Array.Empty<string>();

        var tableName = entityType.GetTableName();
        if (string.IsNullOrEmpty(tableName)) return Array.Empty<string>();
        var schema = string.IsNullOrEmpty(entityType.GetSchema()) ? "dbo" : entityType.GetSchema();
        if (!IsSafeIdent(schema!) || !IsSafeIdent(tableName)) return Array.Empty<string>();

        var valueCol = valueProp.GetColumnName();
        if (string.IsNullOrEmpty(valueCol) || !IsSafeIdent(valueCol)) return Array.Empty<string>();

        var companyProp = entityType.FindProperty("CompanyId");
        var companyCol = companyProp?.GetColumnName();
        if (string.IsNullOrEmpty(companyCol) || !IsSafeIdent(companyCol))
            return Array.Empty<string>();

        var sql = $"""
            SELECT TOP ({take}) v FROM (
              SELECT DISTINCT CAST([{valueCol}] AS nvarchar(max)) AS v
              FROM [{schema}].[{tableName}]
              WHERE [{companyCol}] = @cid AND [{valueCol}] IS NOT NULL
            ) d
            ORDER BY v
            """;

        var conn = _db.Database.GetDbConnection();
        await _db.Database.OpenConnectionAsync(ct);
        try
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            var p = cmd.CreateParameter();
            p.ParameterName = "@cid";
            p.Value = companyId;
            cmd.Parameters.Add(p);

            var list = new List<string>();
            await using var reader = await cmd.ExecuteReaderAsync(ct);
            while (await reader.ReadAsync(ct))
            {
                if (reader.IsDBNull(0)) continue;
                var s = reader.GetString(0);
                if (!string.IsNullOrWhiteSpace(s))
                    list.Add(s.Trim());
            }
            return list;
        }
        finally
        {
            await _db.Database.CloseConnectionAsync();
        }
    }

    private IReadOnlyList<RecordRuleFieldDto> GetAllRuleableFields(string permissionsPrefix, string modelKey)
    {
        if (!RecordRuleModelRegistry.TryGetEntityType(permissionsPrefix, modelKey, out var clrType) || clrType is null)
            return Array.Empty<RecordRuleFieldDto>();

        var names = RecordRuleModelRegistry.GetRuleablePropertyNames(clrType);
        var et = _db.Model.FindEntityType(clrType);
        var list = new List<RecordRuleFieldDto>();
        foreach (var name in names)
        {
            if (et?.FindProperty(name) is null) continue;
            var pi = RecordRuleModelRegistry.ResolveProperty(clrType, name);
            if (pi is null) continue;
            var t = pi.PropertyType;
            var u = Nullable.GetUnderlyingType(t) ?? t;
            list.Add(new RecordRuleFieldDto
            {
                name = name,
                valueKind = u.IsEnum ? "enum" : u == typeof(string) ? "string" : "number",
            });
        }
        return list;
    }

    private async Task<HashSet<string>> GetVisibleFieldNameSetAsync(
        string permissionsPrefix,
        string modelKey,
        CancellationToken ct)
    {
        var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var all = GetAllRuleableFields(permissionsPrefix, modelKey);
        if (all.Count == 0) return result;

        var prefix = (permissionsPrefix ?? "").Trim();
        var key = (modelKey ?? "").Trim();

        var rows = await _db.RecordRuleModelFieldSettings.AsNoTracking()
            .Where(x => x.PermissionsPrefix == prefix && x.ModelKey == key)
            .ToListAsync(ct);

        if (rows.Count == 0)
        {
            foreach (var f in all)
            {
                if (IsHeuristicSuggestedField(f.name))
                    result.Add(f.name);
            }
            return result;
        }

        foreach (var row in rows)
        {
            if (!row.IsEnabled) continue;
            var match = all.FirstOrDefault(a =>
                string.Equals(a.name, row.FieldName, StringComparison.OrdinalIgnoreCase));
            if (match is not null)
                result.Add(match.name);
        }

        return result;
    }

    /// <summary>Default fields when no developer configuration exists: tenant, workflow, and FK links.</summary>
    internal static bool IsHeuristicSuggestedField(string name)
    {
        if (string.IsNullOrEmpty(name)) return false;
        if (string.Equals(name, "CompanyId", StringComparison.OrdinalIgnoreCase)) return true;
        if (string.Equals(name, "Status", StringComparison.OrdinalIgnoreCase)) return true;
        if (string.Equals(name, "Returned", StringComparison.OrdinalIgnoreCase)) return true;
        if (name.EndsWith("Id", StringComparison.Ordinal) &&
            !string.Equals(name, "Id", StringComparison.OrdinalIgnoreCase))
            return true;
        return false;
    }

    private static bool IsSafeIdent(string s) => s.Length > 0 && s.Length <= 128 && s_safeIdent.IsMatch(s);
}

public sealed class RecordRuleFieldDto
{
    public string name { get; set; } = "";
    public string valueKind { get; set; } = "string";
}

public sealed class RecordRuleModelFieldSettingsGetDto
{
    public string permissionsPrefix { get; set; } = "";
    public string modelKey { get; set; } = "";
    public IReadOnlyList<RecordRuleModelFieldSettingRowDto> fields { get; set; } = Array.Empty<RecordRuleModelFieldSettingRowDto>();
}

public sealed class RecordRuleModelFieldSettingRowDto
{
    public string name { get; set; } = "";
    public string valueKind { get; set; } = "string";
    public bool enabled { get; set; }
    public bool suggestedDefault { get; set; }
}

public sealed class RecordRuleFieldToggleDto
{
    public string fieldName { get; set; } = "";
    public bool enabled { get; set; }
}
