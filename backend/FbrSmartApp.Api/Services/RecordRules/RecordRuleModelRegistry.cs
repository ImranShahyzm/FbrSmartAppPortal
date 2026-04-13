using System.Collections.Concurrent;
using System.Reflection;
using FbrSmartApp.Api;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Services.RecordRules;

public static class RecordRuleModelRegistry
{
    private static readonly Dictionary<(string Prefix, string ModelKey), Type> s_map = new();
    private static readonly ConcurrentDictionary<Type, IReadOnlyList<string>> s_ruleablePropertyNamesCache = new();

    static RecordRuleModelRegistry()
    {
        foreach (var type in Assembly.GetExecutingAssembly().GetTypes())
        {
            if (!type.IsClass || type.IsAbstract) continue;
            var attr = type.GetCustomAttribute<RecordRuleEntityAttribute>(inherit: false);
            if (attr is null) continue;
            s_map[NormKey(attr.PermissionsPrefix, attr.ModelKey)] = type;
        }
    }

    private static (string, string) NormKey(string permissionsPrefix, string modelKey) =>
        (permissionsPrefix.Trim().ToLowerInvariant(), modelKey.Trim().ToLowerInvariant());

    public static bool TryGetEntityType(string permissionsPrefix, string modelKey, out Type? entityType)
    {
        entityType = null;
        return s_map.TryGetValue(NormKey(permissionsPrefix, modelKey), out entityType);
    }

    /// <summary>All types marked with <see cref="RecordRuleEntityAttribute"/> (original prefix/key casing from attributes).</summary>
    public static IEnumerable<(string PermissionsPrefix, string ModelKey, Type ClrType)> EnumerateRegistrations()
    {
        foreach (var t in s_map.Values)
        {
            var attr = t.GetCustomAttribute<RecordRuleEntityAttribute>(inherit: false);
            if (attr is null) continue;
            yield return (attr.PermissionsPrefix.Trim(), attr.ModelKey.Trim(), t);
        }
    }

    /// <summary>CLR properties that can be used in rules (primitives, string, Guid, DateTime, enum, etc.).</summary>
    public static IReadOnlyList<string> GetRuleablePropertyNames(Type entityType) =>
        s_ruleablePropertyNamesCache.GetOrAdd(entityType, BuildRuleablePropertyNames);

    private static IReadOnlyList<string> BuildRuleablePropertyNames(Type entityType)
    {
        var list = new List<string>();
        foreach (var p in entityType.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            if (!p.CanRead || p.GetIndexParameters().Length > 0) continue;
            if (!IsRuleableClrProperty(p)) continue;
            list.Add(p.Name);
        }
        return list.OrderBy(x => x, StringComparer.OrdinalIgnoreCase).ToList();
    }

    private static bool IsRuleableClrProperty(PropertyInfo p)
    {
        var t = p.PropertyType;
        var u = Nullable.GetUnderlyingType(t) ?? t;
        if (u.IsEnum) return true;
        if (u == typeof(string)) return true;
        if (u == typeof(Guid)) return true;
        if (u == typeof(DateTime) || u == typeof(DateTimeOffset) || u == typeof(DateOnly) || u == typeof(TimeOnly))
            return true;
        if (u == typeof(decimal)) return true;
        if (u == typeof(bool)) return true;
        if (u == typeof(byte[])) return false;
        if (u.IsPrimitive && u != typeof(char) && u != typeof(IntPtr) && u != typeof(UIntPtr)) return true;
        return false;
    }

    public static bool IsRuleableField(Type entityType, string fieldName)
    {
        var p = ResolveProperty(entityType, fieldName);
        return p is not null && IsRuleableClrProperty(p);
    }

    public static PropertyInfo? ResolveProperty(Type entityType, string fieldName)
    {
        return entityType.GetProperty(
            fieldName,
            BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
    }

}
