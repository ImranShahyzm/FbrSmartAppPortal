using System.Security.Claims;
using System.Text.Json;
using FbrSmartApp.Api.Auth;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/phaseTags")]
[Authorize]
public sealed class PhaseTagsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PhaseTagsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [HasPermission("accounting.glChartAccounts.read")]
    public async Task<IActionResult> GetList([FromQuery] string? range, [FromQuery] string? filter, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();

        string? q = null;
        if (!string.IsNullOrWhiteSpace(filter))
        {
            try
            {
                using var doc = JsonDocument.Parse(filter);
                if (doc.RootElement.TryGetProperty("q", out var qEl))
                    q = qEl.GetString();
            }
            catch (JsonException)
            {
                // ignore
            }
        }

        var query = _db.PhaseTags.AsNoTracking()
            .Where(t => (t.CompanyId ?? 0) == companyId);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var t = q.Trim();
            query = query.Where(x => x.TagName.Contains(t));
        }

        query = query.OrderBy(t => t.TagName);

        var total = await query.CountAsync(ct);
        var from = 0;
        var to = Math.Min(24, Math.Max(total - 1, 0));
        if (!string.IsNullOrWhiteSpace(range))
        {
            try
            {
                var arr = JsonSerializer.Deserialize<int[]>(range);
                if (arr is { Length: >= 2 })
                {
                    from = Math.Max(0, arr[0]);
                    to = Math.Max(from, arr[1]);
                }
            }
            catch (JsonException)
            {
                // ignore
            }
        }

        var take = Math.Min(to - from + 1, 1000);
        var rows = await query.Skip(from).Take(take).ToListAsync(ct);
        Response.Headers.ContentRange = $"phaseTags {from}-{from + Math.Max(rows.Count - 1, 0)}/{total}";
        Response.Headers.AccessControlExposeHeaders = "Content-Range";

        return Ok(rows.Select(x => new PhaseTagDto
        {
            id = x.Id,
            tagName = x.TagName,
            tagColor = x.TagColor,
        }).ToList());
    }

    public sealed class PhaseTagWriteDto
    {
        public string? tagName { get; set; }
        public string? tagColor { get; set; }
    }

    [HttpPost]
    [HasPermission("accounting.glChartAccounts.write")]
    public async Task<IActionResult> Create([FromBody] PhaseTagWriteDto body, CancellationToken ct)
    {
        var companyId = GetCompanyIdOrThrow();
        var name = (body.tagName ?? "").Trim();
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new { message = "Tag name is required." });
        if (name.Length > 200)
            return BadRequest(new { message = "Tag name must be at most 200 characters." });

        var color = string.IsNullOrWhiteSpace(body.tagColor) ? null : body.tagColor!.Trim();
        if (color != null && color.Length > 20)
            return BadRequest(new { message = "Tag color must be at most 20 characters." });

        var exists = await _db.PhaseTags.AsNoTracking()
            .AnyAsync(t => (t.CompanyId ?? 0) == companyId && t.TagName == name, ct);
        if (exists)
            return BadRequest(new { message = "A tag with the same name already exists." });

        var entity = new PhaseTag
        {
            CompanyId = companyId,
            TagName = name,
            TagColor = color,
            EntryUserDateTime = DateTime.UtcNow,
        };
        _db.PhaseTags.Add(entity);
        await _db.SaveChangesAsync(ct);

        return Ok(new PhaseTagDto { id = entity.Id, tagName = entity.TagName, tagColor = entity.TagColor });
    }

    public sealed class PhaseTagDto
    {
        public int id { get; set; }
        public string tagName { get; set; } = "";
        public string? tagColor { get; set; }
    }

    private int GetCompanyIdOrThrow()
    {
        var raw = User.FindFirstValue("companyId");
        if (!int.TryParse(raw, out var companyId))
            throw new UnauthorizedAccessException("Missing companyId claim.");
        return companyId;
    }
}

