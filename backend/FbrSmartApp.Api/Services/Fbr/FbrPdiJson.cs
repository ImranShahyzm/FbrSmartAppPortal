using System.Linq;
using System.Text.Json;

namespace FbrSmartApp.Api.Services.Fbr;

internal static class FbrPdiJson
{
    public static IEnumerable<JsonElement> EnumerateItems(JsonElement root)
    {
        if (root.ValueKind == JsonValueKind.Array)
        {
            foreach (var el in root.EnumerateArray())
                yield return el;
            yield break;
        }

        if (root.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in root.EnumerateObject())
            {
                if (prop.Value.ValueKind != JsonValueKind.Array)
                    continue;
                foreach (var el in prop.Value.EnumerateArray())
                    yield return el;
                yield break;
            }
        }
    }

    public static int GetIntLoose(JsonElement el, params string[] preferredNames)
    {
        foreach (var name in preferredNames)
        {
            if (el.ValueKind != JsonValueKind.Object)
                continue;
            foreach (var p in el.EnumerateObject())
            {
                if (!string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase))
                    continue;
                return ReadInt(p.Value);
            }
        }

        if (el.ValueKind == JsonValueKind.Object)
        {
            foreach (var p in el.EnumerateObject())
            {
                if (preferredNames.Any(n => string.Equals(n, p.Name, StringComparison.OrdinalIgnoreCase)))
                    return ReadInt(p.Value);
            }

            foreach (var p in el.EnumerateObject())
            {
                if (p.Name.Contains("TYPE_ID", StringComparison.OrdinalIgnoreCase) ||
                    p.Name.Equals("docTypeId", StringComparison.OrdinalIgnoreCase) ||
                    p.Name.Contains("UOM_ID", StringComparison.OrdinalIgnoreCase) ||
                    p.Name.Contains("uoM_ID", StringComparison.OrdinalIgnoreCase) ||
                    (p.Name.Contains("Rate", StringComparison.OrdinalIgnoreCase) &&
                     p.Name.Contains("ID", StringComparison.OrdinalIgnoreCase) &&
                     !p.Name.Contains("TYPE", StringComparison.OrdinalIgnoreCase)))
                {
                    var v = ReadInt(p.Value);
                    if (v != 0)
                        return v;
                }
            }
        }

        return 0;
    }

    public static decimal GetDecimalLoose(JsonElement el, params string[] preferredNames)
    {
        foreach (var name in preferredNames)
        {
            if (el.ValueKind != JsonValueKind.Object)
                continue;
            foreach (var p in el.EnumerateObject())
            {
                if (!string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase))
                    continue;
                return ReadDecimal(p.Value);
            }
        }

        if (el.ValueKind == JsonValueKind.Object)
        {
            foreach (var p in el.EnumerateObject())
            {
                if (p.Name.Contains("VALUE", StringComparison.OrdinalIgnoreCase) &&
                    p.Name.Contains("Rate", StringComparison.OrdinalIgnoreCase))
                    return ReadDecimal(p.Value);
            }
        }

        return 0;
    }

    public static string GetStringLoose(JsonElement el, params string[] preferredNames)
    {
        foreach (var name in preferredNames)
        {
            if (el.ValueKind != JsonValueKind.Object)
                continue;
            foreach (var p in el.EnumerateObject())
            {
                if (!string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase))
                    continue;
                return p.Value.GetString()?.Trim() ?? "";
            }
        }

        if (el.ValueKind == JsonValueKind.Object)
        {
            foreach (var p in el.EnumerateObject())
            {
                if (p.Name.Contains("DESC", StringComparison.OrdinalIgnoreCase) &&
                    !p.Name.Contains("ITEM", StringComparison.OrdinalIgnoreCase))
                    return p.Value.GetString()?.Trim() ?? "";
            }
        }

        return "";
    }

    private static int ReadInt(JsonElement v)
    {
        return v.ValueKind switch
        {
            JsonValueKind.Number => v.TryGetInt32(out var i) ? i : (int)v.GetDecimal(),
            JsonValueKind.String => int.TryParse(v.GetString(), out var p) ? p : 0,
            _ => 0,
        };
    }

    private static decimal ReadDecimal(JsonElement v)
    {
        return v.ValueKind switch
        {
            JsonValueKind.Number => v.GetDecimal(),
            JsonValueKind.String => decimal.TryParse(v.GetString(), System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var d)
                ? d
                : 0,
            _ => 0,
        };
    }
}
