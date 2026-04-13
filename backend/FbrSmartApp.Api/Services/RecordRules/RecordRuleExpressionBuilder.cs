using System.Linq.Expressions;
using System.Reflection;
using System.Text.Json;
using FbrSmartApp.Api.Models;

namespace FbrSmartApp.Api.Services.RecordRules;

public static class RecordRuleExpressionBuilder
{
    public static Expression<Func<T, bool>>? TryBuild<T>(GroupRecordRule rule, RecordRuleContext ctx)
    {
        var field = (rule.FieldName ?? "").Trim();
        var op = (rule.Operator ?? "").Trim();
        if (field.Length == 0 || op.Length == 0 || string.IsNullOrWhiteSpace(rule.RightOperandJson))
            return null;
        if (!RecordRuleRightOperandJson.TryParse(rule.RightOperandJson, out var operand) || operand is null)
            return null;

        var param = Expression.Parameter(typeof(T), "e");
        var prop = RecordRuleModelRegistry.ResolveProperty(typeof(T), field);
        if (prop is null) return null;

        var left = Expression.Property(param, prop);
        Expression? body = op.ToLowerInvariant() switch
        {
            "eq" => BuildEquality(left, prop.PropertyType, operand, ctx, negate: false),
            "neq" => BuildEquality(left, prop.PropertyType, operand, ctx, negate: true),
            "in" => BuildIn(left, prop.PropertyType, operand, ctx, negate: false),
            "notin" => BuildIn(left, prop.PropertyType, operand, ctx, negate: true),
            _ => null,
        };
        if (body is null) return null;
        return Expression.Lambda<Func<T, bool>>(body, param);
    }

    private static Expression? BuildEquality(
        Expression left,
        Type propertyType,
        RecordRuleRightOperand operand,
        RecordRuleContext ctx,
        bool negate)
    {
        object? rightVal = ResolveOperandValue(operand, propertyType, ctx, forContains: false);
        if (rightVal is null && Nullable.GetUnderlyingType(propertyType) is null && propertyType.IsValueType)
            return null;

        var right = Expression.Constant(rightVal, propertyType);
        Expression cmp = Expression.Equal(left, right);
        if (negate) cmp = Expression.Not(cmp);
        return cmp;
    }


    private static Expression? BuildIn(
        Expression left,
        Type propertyType,
        RecordRuleRightOperand operand,
        RecordRuleContext ctx,
        bool negate)
    {
        var underlying = Nullable.GetUnderlyingType(propertyType) ?? propertyType;
        object?[]? values = null;
        if (operand.Kind == RecordRuleRightOperandJson.KindLiteralList && operand.Values is { Length: > 0 })
            values = operand.Values;
        else if (operand.Kind == RecordRuleRightOperandJson.KindContext &&
                 string.Equals(operand.Ref, "currentUser.allowedCompanyIds", StringComparison.OrdinalIgnoreCase))
        {
            var arr = ctx.AllowedCompanyIds;
            values = arr.Select(x => (object?)x).ToArray();
        }
        else
            return null;

        var converted = values.Select(v => CoerceToType(v, underlying)).ToArray();
        if (converted.Any(x => x is null && underlying.IsValueType))
            return null;

        var arrObj = CreateTypedArray(converted, underlying);
        if (arrObj is null) return null;
        var arrConst = Expression.Constant(arrObj, arrObj.GetType());
        var contains = typeof(Enumerable).GetMethods(BindingFlags.Public | BindingFlags.Static)
            .First(m => m.Name == nameof(Enumerable.Contains) && m.GetParameters().Length == 2)
            .MakeGenericMethod(underlying);
        Expression valueAccess = left;
        if (Nullable.GetUnderlyingType(propertyType) != null)
            valueAccess = Expression.Property(left, nameof(Nullable<int>.Value));
        var call = Expression.Call(contains, arrConst, valueAccess);
        Expression inner = call;
        if (Nullable.GetUnderlyingType(propertyType) != null)
            inner = Expression.AndAlso(Expression.Property(left, "HasValue"), call);
        if (negate) return Expression.Not(inner);
        return inner;
    }

    private static Array? CreateTypedArray(object?[] converted, Type underlying)
    {
        if (underlying == typeof(int))
        {
            var a = new int[converted.Length];
            for (var i = 0; i < converted.Length; i++)
                a[i] = (int)Convert.ChangeType(converted[i]!, typeof(int))!;
            return a;
        }
        if (underlying == typeof(string))
        {
            var a = new string[converted.Length];
            for (var i = 0; i < converted.Length; i++)
                a[i] = (string)Convert.ChangeType(converted[i]!, typeof(string))!;
            return a;
        }
        if (underlying == typeof(Guid))
        {
            var a = new Guid[converted.Length];
            for (var i = 0; i < converted.Length; i++)
                a[i] = (Guid)Convert.ChangeType(converted[i]!, typeof(Guid))!;
            return a;
        }
        return null;
    }

    private static object? ResolveOperandValue(
        RecordRuleRightOperand operand,
        Type propertyType,
        RecordRuleContext ctx,
        bool forContains)
    {
        var underlying = Nullable.GetUnderlyingType(propertyType) ?? propertyType;
        if (operand.Kind == RecordRuleRightOperandJson.KindContext && operand.Ref is { Length: > 0 })
        {
            var v = ctx.ResolveContextRef(operand.Ref);
            return CoerceToType(v, underlying);
        }
        if (operand.Kind == RecordRuleRightOperandJson.KindLiteral)
            return CoerceToType(operand.Value, underlying);
        if (operand.Kind == RecordRuleRightOperandJson.KindLiteralList && !forContains)
            return null;
        return null;
    }

    private static object? CoerceToType(object? value, Type targetNonNullable)
    {
        if (value is null) return null;
        if (value is JsonElement jsonEl)
        {
            if (jsonEl.ValueKind == JsonValueKind.Null) return null;
            if (targetNonNullable == typeof(int) && jsonEl.TryGetInt32(out var jInt)) return jInt;
            if (targetNonNullable == typeof(long) && jsonEl.TryGetInt64(out var jLong)) return jLong;
            if (targetNonNullable == typeof(string)) return jsonEl.GetString();
            if (targetNonNullable == typeof(bool) && jsonEl.ValueKind is JsonValueKind.True or JsonValueKind.False)
                return jsonEl.GetBoolean();
        }
        if (targetNonNullable == typeof(Guid) && value is string s && Guid.TryParse(s, out var g))
            return g;
        if (targetNonNullable == typeof(int) && value is long l) return (int)l;
        if (targetNonNullable == typeof(string))
            return value.ToString();
        try
        {
            return Convert.ChangeType(value, targetNonNullable);
        }
        catch
        {
            return null;
        }
    }
}
