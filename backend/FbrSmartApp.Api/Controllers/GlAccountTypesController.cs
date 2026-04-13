using System.Security.Claims;
using FbrSmartApp.Api.Auth;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/glAccountTypes")]
[Authorize]
public sealed class GlAccountTypesController : ControllerBase
{
    private readonly AppDbContext _db;

    public GlAccountTypesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [HasPermission("accounting.glAccountTypes.read")]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var rows = await _db.GlAccountTypes.AsNoTracking().OrderBy(x => x.Id).ToListAsync(ct);
        var parentIdsThatHaveChildren = new HashSet<int>(
            rows.Where(r => r.MainParentId != null).Select(r => r.MainParentId!.Value));

        var dtos = rows.Select(x => new GlAccountTypeDto
        {
            id = x.Id,
            title = x.Title,
            mainParent = x.MainParentId,
            reportingHead = x.ReportingHead,
            orderBy = x.DisplayOrder,
            selectable = !parentIdsThatHaveChildren.Contains(x.Id),
        }).ToList();

        return Ok(dtos);
    }

    private async Task<User?> GetCurrentUserAsync(CancellationToken ct)
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        return await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
    }

    public sealed class GlAccountTypeDto
    {
        public int id { get; set; }
        public string? title { get; set; }
        public int? mainParent { get; set; }
        public string? reportingHead { get; set; }
        public byte? orderBy { get; set; }
        public bool selectable { get; set; }
    }
}
