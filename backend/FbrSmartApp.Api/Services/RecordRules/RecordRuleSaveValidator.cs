namespace FbrSmartApp.Api.Services.RecordRules;

public static class RecordRuleSaveValidator
{
    private static readonly HashSet<string> s_ops = new(StringComparer.OrdinalIgnoreCase) { "eq", "neq", "in", "notin" };

    public static bool TryValidateRow(
        string permissionsPrefix,
        string modelKey,
        string? fieldName,
        string? ruleOperator,
        string? rightOperandJson,
        out string? error)
    {
        error = null;
        var field = (fieldName ?? "").Trim();
        var op = (ruleOperator ?? "").Trim();
        var json = (rightOperandJson ?? "").Trim();

        if (field.Length == 0 && op.Length == 0 && json.Length == 0)
            return true;

        if (field.Length == 0 || op.Length == 0 || json.Length == 0)
        {
            error = "Record rule field, operator, and value JSON are required together.";
            return false;
        }

        if (!RecordRuleModelRegistry.TryGetEntityType(permissionsPrefix, modelKey, out var entityType) || entityType is null)
        {
            error = "Unknown model for record rule. Add [RecordRuleEntity(prefix, modelKey)] to the entity class.";
            return false;
        }

        if (!RecordRuleModelRegistry.IsRuleableField(entityType, field))
        {
            error = $"Field '{field}' cannot be used in record rules for this model.";
            return false;
        }

        if (!s_ops.Contains(op))
        {
            error = "Invalid operator (use eq, neq, in, notIn).";
            return false;
        }

        if (!RecordRuleRightOperandJson.TryParse(json, out _))
        {
            error = "Invalid value JSON.";
            return false;
        }

        return true;
    }
}
