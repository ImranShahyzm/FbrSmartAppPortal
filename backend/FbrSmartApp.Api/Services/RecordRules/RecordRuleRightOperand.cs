using System.Text.Json;

namespace FbrSmartApp.Api.Services.RecordRules;

public static class RecordRuleRightOperandJson
{
    public const string KindContext = "context";
    public const string KindLiteral = "literal";
    public const string KindLiteralList = "literalList";

    public static bool TryParse(string? json, out RecordRuleRightOperand? operand)
    {
        operand = null;
        if (string.IsNullOrWhiteSpace(json)) return false;
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (!root.TryGetProperty("kind", out var kindEl)) return false;
            var kind = kindEl.GetString();
            if (kind == KindContext)
            {
                var r = root.TryGetProperty("ref", out var refEl) ? refEl.GetString() : null;
                if (string.IsNullOrWhiteSpace(r)) return false;
                operand = new RecordRuleRightOperand(KindContext, Ref: r.Trim(), Value: null, Values: null);
                return true;
            }
            if (kind == KindLiteral)
            {
                if (!root.TryGetProperty("value", out var v)) return false;
                operand = new RecordRuleRightOperand(KindLiteral, Ref: null, Value: ParseJsonElement(v), Values: null);
                return true;
            }
            if (kind == KindLiteralList)
            {
                if (!root.TryGetProperty("values", out var arr) || arr.ValueKind != JsonValueKind.Array)
                    return false;
                var list = new List<object?>();
                foreach (var el in arr.EnumerateArray())
                    list.Add(ParseJsonElement(el));
                operand = new RecordRuleRightOperand(KindLiteralList, Ref: null, Value: null, Values: list.ToArray());
                return true;
            }
        }
        catch (JsonException)
        {
            return false;
        }
        return false;
    }

    private static object? ParseJsonElement(JsonElement el)
    {
        return el.ValueKind switch
        {
            JsonValueKind.String => el.GetString(),
            JsonValueKind.Number => el.TryGetInt32(out var i)
                ? i
                : el.TryGetInt64(out var l)
                    ? l
                    : el.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            _ => el.GetRawText(),
        };
    }

    public static string SerializeLiteral(object? value) =>
        JsonSerializer.Serialize(new Dictionary<string, object?> { ["kind"] = KindLiteral, ["value"] = value });

    public static string SerializeLiteralList(IReadOnlyList<object?> values) =>
        JsonSerializer.Serialize(new Dictionary<string, object?>
        {
            ["kind"] = KindLiteralList,
            ["values"] = values.ToArray(),
        });

    public static string SerializeContextRef(string refName) =>
        JsonSerializer.Serialize(new Dictionary<string, string> { ["kind"] = KindContext, ["ref"] = refName });
}

public sealed record RecordRuleRightOperand(string Kind, string? Ref, object? Value, object?[]? Values);
