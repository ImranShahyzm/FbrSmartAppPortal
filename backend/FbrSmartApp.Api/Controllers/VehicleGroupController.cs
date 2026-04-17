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

        // ✅ Get All
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _context.VehicleGroups.ToListAsync());
        }

        // ✅ Get By Id
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var data = await _context.VehicleGroups.FindAsync(id);
            if (data == null) return NotFound();

            return Ok(data);
        }

        // ✅ Create (ONLY Title)
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