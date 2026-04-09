using System.Security.Claims;
using System.Text.Json;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/fbrScenarios")]
[Authorize]
public sealed class FbrScenariosController : ControllerBase
{
    private readonly AppDbContext _db;

    public FbrScenariosController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? sort,
        [FromQuery] string? range,
        [FromQuery] string? filter,
        CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var query = _db.FbrScenarios.AsNoTracking().Where(x => x.CompanyId == companyId);

        if (!string.IsNullOrWhiteSpace(filter))
        {
            try
            {
                using var doc = JsonDocument.Parse(filter);
                if (doc.RootElement.TryGetProperty("q", out var qEl))
                {
                    var q = qEl.GetString();
                    if (!string.IsNullOrWhiteSpace(q))
                    {
                        var qq = q.Trim();
                        query = query.Where(x =>
                            x.ScenarioCode.Contains(qq) || x.Description.Contains(qq));
                    }
                }
            }
            catch (JsonException)
            {
                // ignore
            }
        }

        query = query.OrderBy(x => x.ScenarioCode);
        var total = await query.CountAsync(ct);
        var items = await query.Take(1000).ToListAsync(ct);

        Response.Headers["Content-Range"] = $"fbrScenarios 0-{Math.Max(items.Count - 1, 0)}/{total}";
        return Ok(items);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<FbrScenario>> GetOne(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var item = await _db.FbrScenarios.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (item is null) return NotFound();
        return Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<FbrScenario>> Create([FromBody] UpsertFbrScenarioRequest req, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var code = (req.ScenarioCode ?? "").Trim();
        if (string.IsNullOrEmpty(code))
            return BadRequest(new { message = "ScenarioCode is required." });

        if (await _db.FbrScenarios.AnyAsync(x => x.CompanyId == companyId && x.ScenarioCode == code, ct))
            return Conflict(new { message = "Scenario code already exists for this company." });

        var entity = new FbrScenario
        {
            CompanyId = companyId,
            ScenarioCode = code,
            Description = req.Description?.Trim() ?? "",
            FbrPdiTransTypeId = req.FbrPdiTransTypeId,
        };
        _db.FbrScenarios.Add(entity);
        await _db.SaveChangesAsync(ct);
        return Ok(entity);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<FbrScenario>> Update(int id, [FromBody] UpsertFbrScenarioRequest req, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var existing = await _db.FbrScenarios.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (existing is null) return NotFound();

        var code = (req.ScenarioCode ?? existing.ScenarioCode).Trim();
        if (string.IsNullOrEmpty(code))
            return BadRequest(new { message = "ScenarioCode is required." });

        if (await _db.FbrScenarios.AnyAsync(
                x => x.CompanyId == companyId && x.ScenarioCode == code && x.Id != id, ct))
            return Conflict(new { message = "Scenario code already exists for this company." });

        existing.ScenarioCode = code;
        existing.Description = req.Description?.Trim() ?? "";
        existing.FbrPdiTransTypeId = req.FbrPdiTransTypeId;
        await _db.SaveChangesAsync(ct);
        return Ok(existing);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var existing = await _db.FbrScenarios.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (existing is null) return NotFound();

        var inUse = await _db.FbrInvoices.AnyAsync(x => x.CompanyId == companyId && x.FbrScenarioId == id, ct);
        if (inUse)
            return Conflict(new { message = "Scenario is in use by invoices." });

        _db.FbrScenarios.Remove(existing);
        await _db.SaveChangesAsync(ct);
        return Ok(new { id });
    }

    private int GetCompanyIdOrThrow()
    {
        var raw = User.FindFirstValue("companyId");
        if (!int.TryParse(raw, out var companyId))
            throw new UnauthorizedAccessException("Missing companyId claim.");
        return companyId;
    }

    public sealed class UpsertFbrScenarioRequest
    {
        public string? ScenarioCode { get; set; }
        public string? Description { get; set; }
        public int? FbrPdiTransTypeId { get; set; }
    }
}
