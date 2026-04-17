using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;

namespace FbrSmartApp.Api.Controllers;

/// <summary>
/// Matches react-admin resource name <c>salesServiceInfo</c> and <c>api/colorInformation</c>-style list pagination.
/// </summary>
[Route("api/salesServiceInfo")]
[ApiController]
public class SaleServiceInfoController : ControllerBase
{
    private readonly AppDbContext _context;

    public SaleServiceInfoController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? range, [FromQuery] string? q, [FromQuery] string? sort, [FromQuery] string? order)
    {
        var query = _context.SaleServiceInfos.AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(x =>
                (x.Name != null && x.Name.Contains(term)) ||
                (x.Description != null && x.Description.Contains(term)) ||
                (x.GLCAID != null && x.GLCAID.ToString()!.Contains(term)));
        }

        var total = await query.CountAsync();

        int skip = 0;
        int take = 25;
        if (!string.IsNullOrEmpty(range))
        {
            var parts = range.Trim('[', ']').Split(',');
            if (parts.Length == 2 &&
                int.TryParse(parts[0], out int from) &&
                int.TryParse(parts[1], out int to))
            {
                skip = from;
                take = to - from + 1;
            }
        }

        query = ApplySaleServiceSort(query, sort, order);

        var data = await query
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        var end = skip + Math.Max(data.Count - 1, 0);
        Response.Headers.Append("Content-Range", $"salesServiceInfo {skip}-{end}/{total}");
        Response.Headers.Append("Access-Control-Expose-Headers", "Content-Range");

        return Ok(data);
    }

    private static IQueryable<SaleServiceInfo> ApplySaleServiceSort(IQueryable<SaleServiceInfo> query, string? sort, string? order)
    {
        var desc = string.Equals(order, "desc", StringComparison.OrdinalIgnoreCase);
        var field = (sort ?? string.Empty).Trim().ToLowerInvariant();
        return field switch
        {
            "saleserviceinfoid" => desc
                ? query.OrderByDescending(x => x.SaleServiceInfoID)
                : query.OrderBy(x => x.SaleServiceInfoID),
            "name" => desc
                ? query.OrderByDescending(x => x.Name)
                : query.OrderBy(x => x.Name),
            "glcaid" => desc
                ? query.OrderByDescending(x => x.GLCAID)
                : query.OrderBy(x => x.GLCAID),
            "description" => desc
                ? query.OrderByDescending(x => x.Description)
                : query.OrderBy(x => x.Description),
            "entryuserdatetime" => desc
                ? query.OrderByDescending(x => x.EntryUserDateTime)
                : query.OrderBy(x => x.EntryUserDateTime),
            "vehiclegroupid" => desc
                ? query.OrderByDescending(x => x.VehicleGroupId)
                : query.OrderBy(x => x.VehicleGroupId),
            _ => query.OrderBy(x => x.Name).ThenBy(x => x.SaleServiceInfoID),
        };
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var data = await _context.SaleServiceInfos.FindAsync(id);
        if (data == null)
            return NotFound(new { message = "Sales service not found" });

        return Ok(data);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaleServiceInfo model)
    {
        if (model == null)
            return BadRequest();

        // PK is not database-generated in this schema (no IDENTITY); assign next id so INSERT never sends NULL.
        if (model.SaleServiceInfoID <= 0)
        {
            var nextId = await _context.SaleServiceInfos.AsNoTracking().AnyAsync()
                ? await _context.SaleServiceInfos.AsNoTracking().MaxAsync(x => x.SaleServiceInfoID) + 1
                : 1;
            model.SaleServiceInfoID = nextId;
        }

        model.EntryUserDateTime = DateTime.UtcNow;

        _context.SaleServiceInfos.Add(model);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Sales service created successfully",
            data = model,
        });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] SaleServiceInfo model)
    {
        if (id != model.SaleServiceInfoID)
            return BadRequest(new { message = "Route id and body SaleServiceInfoID must match." });

        var existing = await _context.SaleServiceInfos.FindAsync(id);
        if (existing == null)
            return NotFound();

        existing.Name = model.Name;
        existing.GLCAID = model.GLCAID;
        existing.Description = model.Description;
        existing.ChargeToCompany = model.ChargeToCompany;
        existing.VehicleGroupId = model.VehicleGroupId;
        existing.CompanyID = model.CompanyID;
        existing.ModifyUserDateTime = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { data = existing });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var data = await _context.SaleServiceInfos.FindAsync(id);
        if (data == null)
            return NotFound();

        _context.SaleServiceInfos.Remove(data);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
