namespace FbrSmartApp.Api.Models;

/// <summary>
/// Per-model developer configuration: which CLR fields appear in the record-rules UI.
/// When no rows exist for a model, a heuristic subset (CompanyId, Status, FK *Id) is shown.
/// </summary>
public sealed class RecordRuleModelFieldSetting
{
    public int Id { get; set; }

    public string PermissionsPrefix { get; set; } = "";

    public string ModelKey { get; set; } = "";

    public string FieldName { get; set; } = "";

    public bool IsEnabled { get; set; } = true;
}
