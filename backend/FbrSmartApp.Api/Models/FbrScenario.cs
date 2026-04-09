namespace FbrSmartApp.Api.Models;

/// <summary>FBR digital invoice scenario code (e.g. SN001) per company.</summary>
public sealed class FbrScenario
{
    public int Id { get; set; }

    public int CompanyId { get; set; }

    /// <summary>FBR scenario id string, e.g. SN001.</summary>
    public string ScenarioCode { get; set; } = "";

    public string Description { get; set; } = "";

    /// <summary>Optional PDI transaction type this scenario is associated with (documentation/filter).</summary>
    public int? FbrPdiTransTypeId { get; set; }
}
