using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FbrSmartApp.Api.Models;
using FbrSmartApp.Api.Data;

namespace FbrSmartApp.Api.Controllers
{
   [Route("api/[controller]")]
public class VehicleGroupController : ControllerBase
    {
        private readonly AppDbContext _context;

        public VehicleGroupController(AppDbContext context)
        {
            _context = context;
        }

        // ✅ Get All (react-admin: range, q, sort, order, Content-Range vehicleGroupInfo)
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? range, [FromQuery] string? q, [FromQuery] string? sort, [FromQuery] string? order)
        {
            var query = _context.VehicleGroups.AsQueryable();
            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                query = query.Where(x => x.VehicleGroupTitle != null && x.VehicleGroupTitle.Contains(term));
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

            query = ApplyVehicleGroupSort(query, sort, order);

            var data = await query
                .Skip(skip)
                .Take(take)
                .ToListAsync();

            var end = skip + Math.Max(data.Count - 1, 0);
            Response.Headers.Append("Content-Range", $"vehicleGroupInfo {skip}-{end}/{total}");
            Response.Headers.Append("Access-Control-Expose-Headers", "Content-Range");

            return Ok(data);
        }

        private static IQueryable<VehicleGroup> ApplyVehicleGroupSort(IQueryable<VehicleGroup> query, string? sort, string? order)
        {
            var desc = string.Equals(order, "desc", StringComparison.OrdinalIgnoreCase);
            var field = (sort ?? string.Empty).Trim().ToLowerInvariant();
            return field switch
            {
                "vehiclegroupid" => desc
                    ? query.OrderByDescending(x => x.VehicleGroupID)
                    : query.OrderBy(x => x.VehicleGroupID),
                "vehiclegrouptitle" => desc
                    ? query.OrderByDescending(x => x.VehicleGroupTitle)
                    : query.OrderBy(x => x.VehicleGroupTitle),
                "entryuserdatetime" => desc
                    ? query.OrderByDescending(x => x.EntryUserDateTime)
                    : query.OrderBy(x => x.EntryUserDateTime),
                _ => query.OrderBy(x => x.VehicleGroupTitle).ThenBy(x => x.VehicleGroupID),
            };
        }

        // ✅ Get By Id
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var data = await _context.VehicleGroups.FindAsync(id);
            if (data == null) return NotFound();

            return Ok(data);
        }

        /// <summary>Creates the vehicle group row first; client then posts <see cref="VehicleInfo"/> rows for that group.</summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] VehicleGroup model)
        {
            if (string.IsNullOrWhiteSpace(model.VehicleGroupTitle))
                return BadRequest("VehicleGroupTitle is required");

            var entity = new VehicleGroup
            {
                VehicleGroupTitle = model.VehicleGroupTitle,
                EntryUserDateTime = DateTime.Now
            };

            _context.VehicleGroups.Add(entity);
            await _context.SaveChangesAsync();

            return Ok(entity);
        }

        // ✅ Update (ONLY Title)
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] VehicleGroup model)
        {
            var entity = await _context.VehicleGroups.FindAsync(id);
            if (entity == null) return NotFound();

            if (string.IsNullOrWhiteSpace(model.VehicleGroupTitle))
                return BadRequest("VehicleGroupTitle is required");

            entity.VehicleGroupTitle = model.VehicleGroupTitle;
            entity.ModifyUserDateTime = DateTime.Now;

            await _context.SaveChangesAsync();

            return Ok(entity);
        }

        // ✅ Delete
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _context.VehicleGroups.FindAsync(id);
            if (entity == null) return NotFound();

            _context.VehicleGroups.Remove(entity);
            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}