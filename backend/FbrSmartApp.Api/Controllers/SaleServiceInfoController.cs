using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FbrSmartApp.Api.Models;
using FbrSmartApp.Api.Data;

namespace FbrSmartApp.Api.Controllers
{
    [Route("api/SaleServiceInfo")]   // Explicit route (recommended)
    [ApiController]
    public class SaleServiceInfoController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SaleServiceInfoController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<SaleServiceInfo>>> GetAll()
        {
            var data = await _context.SaleServiceInfos.ToListAsync();
            return Ok(data);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<SaleServiceInfo>> GetById(int id)
        {
            var data = await _context.SaleServiceInfos.FindAsync(id);
            if (data == null) return NotFound();
            return Ok(data);
        }

        [HttpPost]
        public async Task<ActionResult<SaleServiceInfo>> Create(SaleServiceInfo model)
        {
            if (model == null) return BadRequest();

            _context.SaleServiceInfos.Add(model);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = model.SaleServiceInfoID }, model);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, SaleServiceInfo model)
        {
            if (id != model.SaleServiceInfoID) return BadRequest();

            _context.Entry(model).State = EntityState.Modified;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var data = await _context.SaleServiceInfos.FindAsync(id);
            if (data == null) return NotFound();

            _context.SaleServiceInfos.Remove(data);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}