using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FbrSmartApp.Api.Models;
using FbrSmartApp.Api.Data;

namespace FbrSmartApp.Api.Controllers
{
   [Route("api/[controller]")]
public class VehicleInfoController : ControllerBase
    {
        private readonly AppDbContext _context;

        public VehicleInfoController(AppDbContext context)
        {
            _context = context;
        }

        // ✅ Get All (with group)
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _context.VehicleInfos
                .Include(v => v.VehicleGroup)
                .ToListAsync();

            return Ok(data);
        }

        // ✅ Get By Id
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var data = await _context.VehicleInfos
                .Include(v => v.VehicleGroup)
                .FirstOrDefaultAsync(x => x.VehicleID == id);

            if (data == null) return NotFound();

            return Ok(data);
        }

        /// <summary>Creates a vehicle; typically called after <c>VehicleGroup</c> create, with <see cref="VehicleInfo.VehicleCode"/> and <see cref="VehicleInfo.VehicleTitle"/> set to the group title.</summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] VehicleInfo model)
        {
            if (string.IsNullOrWhiteSpace(model.VehicleTitle))
                return BadRequest("VehicleTitle is required");

            var entity = new VehicleInfo
            {
                VehicleGroupID = model.VehicleGroupID,
                VehicleTitle = model.VehicleTitle,
                VehicleCode = model.VehicleCode,
                EntryUserDateTime = DateTime.Now
            };

            _context.VehicleInfos.Add(entity);
            await _context.SaveChangesAsync();

            return Ok(entity);
        }

        // ✅ Update
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] VehicleInfo model)
        {
            var entity = await _context.VehicleInfos.FindAsync(id);
            if (entity == null) return NotFound();

            entity.VehicleGroupID = model.VehicleGroupID;
            entity.VehicleTitle = model.VehicleTitle;
            entity.VehicleCode = model.VehicleCode;
            entity.ModifyUserDateTime = DateTime.Now;

            await _context.SaveChangesAsync();

            return Ok(entity);
        }

        // ✅ Delete
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _context.VehicleInfos.FindAsync(id);
            if (entity == null) return NotFound();

            _context.VehicleInfos.Remove(entity);
            await _context.SaveChangesAsync();

            return Ok();
        }

        // 🔥 Filter by VehicleGroupID (important for dropdowns)
        [HttpGet("by-group/{groupId}")]
        public async Task<IActionResult> GetByGroup(int groupId)
        {
            var data = await _context.VehicleInfos
                .Where(v => v.VehicleGroupID == groupId)
                .ToListAsync();

            return Ok(data);
        }
    }
}