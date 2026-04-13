using System.Security.Claims;
using FbrSmartApp.Api.Auth;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Services.RecordRules;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FbrSmartApp.Api.Controllers;

/// <summary>Dynamic field list and distinct value samples for record rules (no static per-module lists).</summary>
[ApiController]
[Route("api/record-rules")]
[Authorize]
public sealed class RecordRuleMetadataController : ControllerBase
{
    private readonly RecordRuleFieldDiscoveryService _discovery;
    private readonly AppDbContext _db;

    public RecordRuleMetadataController(RecordRuleFieldDiscoveryService discovery, AppDbContext db)
    {
        _discovery = discovery;
        _db = db;
    }

    /// <summary>Models that have a real database table and <see cref="RecordRuleEntityAttribute"/> — for pickers only.</summary>
    [HttpGet("table-models")]
    [HasPermission("settings.securityGroups.read")]
    public ActionResult<IReadOnlyList<RecordRuleTableModelDto>> GetTableModels()
    {
        return Ok(RecordRuleTableModelCatalog.ListPersistedModels(_db));
    }

    [HttpGet("fields")]
    [HasPermission("settings.securityGroups.read")]
    public async Task<ActionResult<IReadOnlyList<RecordRuleFieldDto>>> GetFields(
        [FromQuery] string permissionsPrefix,
        [FromQuery] string modelKey,
        CancellationToken ct = default)
    {
        var prefix = (permissionsPrefix ?? "").Trim();
        var key = (modelKey ?? "").Trim();
        if (prefix.Length == 0 || key.Length == 0)
            return BadRequest(new { message = "permissionsPrefix and modelKey are required." });
        var fields = await _discovery.GetVisibleRuleableFieldsAsync(prefix, key, ct);
        if (fields.Count == 0)
            return NotFound(new { message = "Unknown model or no ruleable fields enabled for record rules." });
        return Ok(fields);
    }

    [HttpGet("field-values")]
    [HasPermission("settings.securityGroups.read")]
    public async Task<ActionResult<RecordRuleFieldValuesDto>> GetFieldValues(
        [FromQuery] string permissionsPrefix,
        [FromQuery] string modelKey,
        [FromQuery] string fieldName,
        [FromQuery] int take = 200,
        CancellationToken ct = default)
    {
        var prefix = (permissionsPrefix ?? "").Trim();
        var key = (modelKey ?? "").Trim();
        var field = (fieldName ?? "").Trim();
        if (prefix.Length == 0 || key.Length == 0 || field.Length == 0)
            return BadRequest(new { message = "permissionsPrefix, modelKey, and fieldName are required." });

        var companyId = GetCompanyIdOrThrow();
        var values = await _discovery.GetDistinctValuesAsync(prefix, key, field, companyId, take, ct);
        return Ok(new RecordRuleFieldValuesDto { values = values });
    }

    /// <summary>Developer UI: all ruleable fields with enable flags (requires security group write).</summary>
    [HttpGet("model-field-settings")]
    [HasPermission("settings.securityGroups.write")]
    public async Task<ActionResult<RecordRuleModelFieldSettingsGetDto>> GetModelFieldSettings(
        [FromQuery] string permissionsPrefix,
        [FromQuery] string modelKey,
        CancellationToken ct = default)
    {
        var prefix = (permissionsPrefix ?? "").Trim();
        var key = (modelKey ?? "").Trim();
        if (prefix.Length == 0 || key.Length == 0)
            return BadRequest(new { message = "permissionsPrefix and modelKey are required." });
        var dto = await _discovery.GetDeveloperFieldSettingsAsync(prefix, key, ct);
        if (dto.fields.Count == 0)
            return NotFound(new { message = "Unknown model or no ruleable fields." });
        return Ok(dto);
    }

    public sealed class RecordRuleModelFieldSettingsSaveBody
    {
        public string? permissionsPrefix { get; set; }
        public string? modelKey { get; set; }
        public List<RecordRuleFieldToggleDto>? fields { get; set; }
    }

    [HttpPut("model-field-settings")]
    [HasPermission("settings.securityGroups.write")]
    public async Task<IActionResult> PutModelFieldSettings(
        [FromBody] RecordRuleModelFieldSettingsSaveBody body,
        CancellationToken ct = default)
    {
        var prefix = (body.permissionsPrefix ?? "").Trim();
        var key = (body.modelKey ?? "").Trim();
        if (prefix.Length == 0 || key.Length == 0)
            return BadRequest(new { message = "permissionsPrefix and modelKey are required." });
        try
        {
            await _discovery.SaveDeveloperFieldSettingsAsync(prefix, key, body.fields, ct);
            var dto = await _discovery.GetDeveloperFieldSettingsAsync(prefix, key, ct);
            return Ok(dto);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("model-field-settings")]
    [HasPermission("settings.securityGroups.write")]
    public async Task<IActionResult> DeleteModelFieldSettings(
        [FromQuery] string permissionsPrefix,
        [FromQuery] string modelKey,
        CancellationToken ct = default)
    {
        var prefix = (permissionsPrefix ?? "").Trim();
        var key = (modelKey ?? "").Trim();
        if (prefix.Length == 0 || key.Length == 0)
            return BadRequest(new { message = "permissionsPrefix and modelKey are required." });
        try
        {
            await _discovery.DeleteDeveloperFieldSettingsAsync(prefix, key, ct);
            return NoContent();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private int GetCompanyIdOrThrow()
    {
        var raw = User.FindFirstValue("companyId");
        if (!int.TryParse(raw, out var companyId))
            throw new UnauthorizedAccessException("Missing companyId claim.");
        return companyId;
    }
}

public sealed class RecordRuleFieldValuesDto
{
    public IReadOnlyList<string> values { get; set; } = Array.Empty<string>();
}
