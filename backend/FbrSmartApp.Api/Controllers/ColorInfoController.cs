using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;

namespace FbrSmartApp.Api.Controllers
{
[Route("api/colorInformation")]
    [ApiController]
    public class ColorInfoController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ColorInfoController(AppDbContext context)
        {
            _context = context;
        }

     [HttpGet]
public async Task<IActionResult> GetAll([FromQuery] string? range, [FromQuery] string? q, [FromQuery] string? sort, [FromQuery] string? order)
{
    var query = _context.ColorInfos.AsQueryable();
    if (!string.IsNullOrWhiteSpace(q))
    {
        var term = q.Trim();
        query = query.Where(x => x.ColorTitle != null && x.ColorTitle.Contains(term));
    }

    var total = await query.CountAsync();

    int skip = 0, take = 25;
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

    query = ApplyColorSort(query, sort, order);

    var data = await query
        .Skip(skip)
        .Take(take)
        .ToListAsync();

    var end = skip + Math.Max(data.Count - 1, 0);
    Response.Headers.Append("Content-Range", $"colorInformation {skip}-{end}/{total}");
    Response.Headers.Append("Access-Control-Expose-Headers", "Content-Range");

    return Ok(data);
}

        private static IQueryable<ColorInfo> ApplyColorSort(IQueryable<ColorInfo> query, string? sort, string? order)
        {
            var desc = string.Equals(order, "desc", StringComparison.OrdinalIgnoreCase);
            var field = (sort ?? string.Empty).Trim().ToLowerInvariant();
            return field switch
            {
                "colorid" => desc
                    ? query.OrderByDescending(x => x.ColorID)
                    : query.OrderBy(x => x.ColorID),
                "colortitle" => desc
                    ? query.OrderByDescending(x => x.ColorTitle)
                    : query.OrderBy(x => x.ColorTitle),
                "entryuserdatetime" => desc
                    ? query.OrderByDescending(x => x.EntryUserDateTime)
                    : query.OrderBy(x => x.EntryUserDateTime),
                _ => query.OrderBy(x => x.ColorTitle).ThenBy(x => x.ColorID),
            };
        }
        // ✅ GET BY ID
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var data = await _context.ColorInfos.FindAsync(id);

            if (data == null)
                return NotFound(new { message = "Color not found" });

            return Ok(data);
        }

        // ✅ CREATE
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ColorInfo model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            model.EntryUserDateTime = DateTime.UtcNow;

            _context.ColorInfos.Add(model);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Color created successfully",
                data = model
            });
        }

        // ✅ UPDATE
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] ColorInfo model)
        {
            if (id != model.ColorID)
                return BadRequest(new { message = "ID mismatch" });

            var existing = await _context.ColorInfos.FindAsync(id);
            if (existing == null)
                return NotFound(new { message = "Color not found" });

            existing.ColorTitle = model.ColorTitle;
            existing.CompanyID = model.CompanyID;
            existing.ModifyUserID = model.ModifyUserID;
            existing.ModifyUserDateTime = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Color updated successfully" });
        }

        // ✅ DELETE
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var data = await _context.ColorInfos.FindAsync(id);

            if (data == null)
                return NotFound(new { message = "Color not found" });

            _context.ColorInfos.Remove(data);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Color deleted successfully" });
        }
    }
}