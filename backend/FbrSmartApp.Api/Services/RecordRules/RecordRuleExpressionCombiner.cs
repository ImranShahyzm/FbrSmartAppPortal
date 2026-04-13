using System.Linq.Expressions;

namespace FbrSmartApp.Api.Services.RecordRules;

internal static class RecordRuleExpressionCombiner
{
    public static Expression<Func<T, bool>>? CombineAnd<T>(IReadOnlyList<Expression<Func<T, bool>>> parts)
    {
        if (parts.Count == 0) return null;
        if (parts.Count == 1) return parts[0];
        var param = Expression.Parameter(typeof(T), "e");
        Expression? body = null;
        foreach (var p in parts)
        {
            var repl = new ParameterReplacer(p.Parameters[0], param).Visit(p.Body);
            body = body == null ? repl : Expression.AndAlso(body, repl);
        }
        return Expression.Lambda<Func<T, bool>>(body!, param);
    }

    public static Expression<Func<T, bool>>? CombineOr<T>(IReadOnlyList<Expression<Func<T, bool>>> parts)
    {
        if (parts.Count == 0) return null;
        if (parts.Count == 1) return parts[0];
        var param = Expression.Parameter(typeof(T), "e");
        Expression? body = null;
        foreach (var p in parts)
        {
            var repl = new ParameterReplacer(p.Parameters[0], param).Visit(p.Body);
            body = body == null ? repl : Expression.OrElse(body, repl);
        }
        return Expression.Lambda<Func<T, bool>>(body!, param);
    }
}
