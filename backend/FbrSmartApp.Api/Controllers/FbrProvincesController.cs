using System.Security.Claims;
using FbrSmartApp.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/fbrProvinces")]
[Authorize]
public sealed class FbrProvincesController : ControllerBase
{
    private readonly AppDbContext _db;

    public FbrProvincesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();

        var pdi = await _db.FbrPdiProvinces.AsNoTracking()
            .Where(p => p.CompanyId == companyId)
            .OrderBy(p => p.Description)
            .Select(p => new
            {
                id = p.StateProvinceCode,
                provincename = p.Description,
                companyID = companyId,
            })
            .ToListAsync(ct);

        if (pdi.Count > 0)
        {
            Response.Headers["Content-Range"] = $"fbrProvinces 0-{Math.Max(pdi.Count - 1, 0)}/{pdi.Count}";
            return Ok(pdi);
        }

        var items = await _db.FbrProvinces.AsNoTracking()
            .Where(p => (p.CompanyID ?? 0) == 0 || p.CompanyID == companyId)
            .OrderBy(p => p.Provincename)
            .ToListAsync(ct);

        Response.Headers["Content-Range"] = $"fbrProvinces 0-{Math.Max(items.Count - 1, 0)}/{items.Count}";
        return Ok(items);
    }

    private int GetCompanyIdOrThrow()
    {
        var raw = User.FindFirstValue("companyId");
        if (!int.TryParse(raw, out var companyId))
        {
            throw new UnauthorizedAccessException("Missing companyId claim.");
        }
        return companyId;
    }
}

