namespace FbrSmartApp.Api;

/// <summary>
/// Marks an entity as participating in record rules for the given permission catalog keys.
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = false)]
public sealed class RecordRuleEntityAttribute : Attribute
{
    public string PermissionsPrefix { get; }
    public string ModelKey { get; }

    public RecordRuleEntityAttribute(string permissionsPrefix, string modelKey)
    {
        PermissionsPrefix = permissionsPrefix;
        ModelKey = modelKey;
    }
}
