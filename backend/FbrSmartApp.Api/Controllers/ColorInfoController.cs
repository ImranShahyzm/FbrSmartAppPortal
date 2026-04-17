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
public async Task<IActionResult> GetAll([FromQuery] string? range)
{
    var query = _context.ColorInfos.AsQueryable();
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

    var data = await query
        .OrderByDescending(x => x.ColorID)
        .Skip(skip)
        .Take(take)
        .ToListAsync();

    Response.Headers.Append("Content-Range", $"colorInformation {skip}-{skip + data.Count - 1}/{total}");
    Response.Headers.Append("Access-Control-Expose-Headers", "Content-Range");

    return Ok(data);
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