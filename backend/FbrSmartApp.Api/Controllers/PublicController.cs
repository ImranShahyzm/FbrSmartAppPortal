using FbrSmartApp.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/public")]
public sealed class PublicController : ControllerBase
{
    private readonly AppDbContext _db;

    public PublicController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>Province list for self-service signup (all rows).</summary>
    [AllowAnonymous]
    [HttpGet("fbr-provinces")]
    public async Task<IActionResult> FbrProvinces(CancellationToken ct)
    {
        var items = await _db.FbrProvinces.AsNoTracking()
            .OrderBy(p => p.Provincename)
            .ThenBy(p => p.Id)
            .ToListAsync(ct);

        Response.Headers["Content-Range"] =
            $"fbrProvinces 0-{Math.Max(items.Count - 1, 0)}/{items.Count}";
        return Ok(items);
    }
}
