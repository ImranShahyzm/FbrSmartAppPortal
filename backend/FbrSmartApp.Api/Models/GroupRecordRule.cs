namespace FbrSmartApp.Api.Models;

public sealed class GroupRecordRule
{
    public int Id { get; set; }

    public int SecurityGroupId { get; set; }
    public SecurityGroup SecurityGroup { get; set; } = null!;

    public string Name { get; set; } = "";

    public string PermissionsPrefix { get; set; } = "";
    public string ModelKey { get; set; } = "";

    /// <summary>Legacy free-form domain; structured rules use FieldName/Operator/RightOperandJson.</summary>
    public string? Domain { get; set; }

    /// <summary>Entity property name (e.g. CompanyId, Status).</summary>
    public string? FieldName { get; set; }

    /// <summary>eq | neq | in | notIn</summary>
    public string? Operator { get; set; }

    /// <summary>JSON: {"kind":"context","ref":"..."} | {"kind":"literal","value":...} | {"kind":"literalList","values":[...]}</summary>
    public string? RightOperandJson { get; set; }

    public bool ApplyRead { get; set; } = true;
    public bool ApplyWrite { get; set; }
    public bool ApplyCreate { get; set; }
    public bool ApplyDelete { get; set; }
}
