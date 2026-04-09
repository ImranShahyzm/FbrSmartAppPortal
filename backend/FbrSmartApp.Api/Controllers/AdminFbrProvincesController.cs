using FbrSmartApp.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

/// <summary>Global FBR province list for admin portal (same master data for all companies).</summary>
[ApiController]
[Route("api/admin/fbr-provinces")]
[Authorize(AuthenticationSchemes = "AdminJwt")]
public sealed class AdminFbrProvincesController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminFbrProvincesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(CancellationToken ct)
    {
        var items = await _db.FbrProvinces.AsNoTracking()
            .OrderBy(p => p.Provincename)
            .ThenBy(p => p.Id)
            .Select(p => new { id = p.Id, provincename = p.Provincename ?? "" })
            .ToListAsync(ct);

        Response.Headers["Content-Range"] =
            $"fbrProvinces 0-{Math.Max(items.Count - 1, 0)}/{items.Count}";
        return Ok(items);
    }
}
