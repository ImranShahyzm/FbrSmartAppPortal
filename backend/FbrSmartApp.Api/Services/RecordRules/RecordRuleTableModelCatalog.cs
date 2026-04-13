using System.Text;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Services.RecordRules;

/// <summary>
/// Lists record-rule models backed by a persisted EF table. Driven by <see cref="RecordRuleEntityAttribute"/> — new apps only need the attribute + DbSet mapping.
/// </summary>
public static class RecordRuleTableModelCatalog
{
    public static IReadOnlyList<RecordRuleTableModelDto> ListPersistedModels(AppDbContext db)
    {
        var outList = new List<RecordRuleTableModelDto>();
        foreach (var (prefix, modelKey, clrType) in RecordRuleModelRegistry.EnumerateRegistrations())
        {
            var et = db.Model.FindEntityType(clrType);
            if (et is null) continue;
            // Keyless entity types (views, raw SQL) have no primary key — skip for persisted table pickers.
            if (et.FindPrimaryKey() is null) continue;
            if (string.IsNullOrEmpty(et.GetTableName())) continue;

            var appDisplayName = ResolveAppDisplayName(prefix);
            var resourceLabel = ResolveResourceLabel(prefix, modelKey) ?? HumanizeModelKey(modelKey);
            var appId = PermissionCatalog.AppIdForPermissionPrefix(prefix) ?? prefix;
            var label = $"{appDisplayName} — {resourceLabel} ({modelKey})";
            var optionKey = $"{prefix}::{modelKey}";

            outList.Add(new RecordRuleTableModelDto
            {
                appId = appId,
                permissionsPrefix = prefix,
                modelKey = modelKey,
                appDisplayName = appDisplayName,
                resourceLabel = resourceLabel,
                label = label,
                optionKey = optionKey,
            });
        }

        return outList
            .OrderBy(x => x.appDisplayName, StringComparer.OrdinalIgnoreCase)
            .ThenBy(x => x.resourceLabel, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static string ResolveAppDisplayName(string permissionsPrefix)
    {
        foreach (var app in PermissionCatalog.Apps)
        {
            if (string.Equals(app.PermissionsPrefix, permissionsPrefix, StringComparison.OrdinalIgnoreCase))
                return app.DisplayName;
        }
        return permissionsPrefix;
    }

    private static string? ResolveResourceLabel(string permissionsPrefix, string modelKey)
    {
        foreach (var app in PermissionCatalog.Apps)
        {
            if (!string.Equals(app.PermissionsPrefix, permissionsPrefix, StringComparison.OrdinalIgnoreCase))
                continue;
            foreach (var r in app.Resources)
            {
                if (string.Equals(r.Key, modelKey, StringComparison.OrdinalIgnoreCase))
                    return r.Label;
            }
        }
        return null;
    }

    private static string HumanizeModelKey(string modelKey)
    {
        if (string.IsNullOrEmpty(modelKey)) return modelKey;
        var sb = new StringBuilder();
        for (var i = 0; i < modelKey.Length; i++)
        {
            var c = modelKey[i];
            if (i > 0 && char.IsUpper(c) && char.IsLower(modelKey[i - 1]))
                sb.Append(' ');
            sb.Append(i == 0 ? char.ToUpperInvariant(c) : c);
        }
        return sb.ToString();
    }
}

public sealed class RecordRuleTableModelDto
{
    public string appId { get; set; } = "";
    public string permissionsPrefix { get; set; } = "";
    public string modelKey { get; set; } = "";
    public string appDisplayName { get; set; } = "";
    public string resourceLabel { get; set; } = "";
    public string label { get; set; } = "";
    public string optionKey { get; set; } = "";
}
