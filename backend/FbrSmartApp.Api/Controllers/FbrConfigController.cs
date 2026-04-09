using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public sealed class FbrConfigController : ControllerBase
{
    private readonly AppDbContext _db;

    public FbrConfigController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("fbrSaleTypes")]
    public async Task<IActionResult> GetSaleTypes(CancellationToken ct)
    {
        var items = await _db.FbrSaleTypes.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Id)
            .ToListAsync(ct);

        Response.Headers["Content-Range"] = $"fbrSaleTypes 0-{Math.Max(items.Count - 1, 0)}/{items.Count}";
        return Ok(items);
    }

    [HttpGet("fbrRates")]
    public async Task<IActionResult> GetRates(CancellationToken ct)
    {
        var items = await _db.FbrRates.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Id)
            .ToListAsync(ct);

        Response.Headers["Content-Range"] = $"fbrRates 0-{Math.Max(items.Count - 1, 0)}/{items.Count}";
        return Ok(items);
    }

    [HttpGet("fbrSroSchedules")]
    public async Task<IActionResult> GetSroSchedules(CancellationToken ct)
    {
        var items = await _db.FbrSroSchedules.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Id)
            .ToListAsync(ct);

        Response.Headers["Content-Range"] = $"fbrSroSchedules 0-{Math.Max(items.Count - 1, 0)}/{items.Count}";
        return Ok(items);
    }

    [HttpGet("fbrSroItems")]
    public async Task<IActionResult> GetSroItems([FromQuery] int? sroId, CancellationToken ct)
    {
        var query = _db.FbrSroItems.AsNoTracking().Where(x => x.IsActive);
        if (sroId.HasValue) query = query.Where(x => x.SroId == sroId.Value);

        var items = await query.OrderBy(x => x.Id).ToListAsync(ct);
        Response.Headers["Content-Range"] = $"fbrSroItems 0-{Math.Max(items.Count - 1, 0)}/{items.Count}";
        return Ok(items);
    }
}

