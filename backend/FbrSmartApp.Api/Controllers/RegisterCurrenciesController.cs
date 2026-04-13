using System.Security.Claims;
using FbrSmartApp.Api.Auth;
using FbrSmartApp.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Controllers;

/// <summary>Read-only list for currency pickers (voucher types, future screens).</summary>
[ApiController]
[Route("api/registerCurrencies")]
[Authorize]
public sealed class RegisterCurrenciesController : ControllerBase
{
    private readonly AppDbContext _db;

    public RegisterCurrenciesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [HasPermission("accounting.glVoucherTypes.read")]
    public async Task<IActionResult> GetList(CancellationToken ct)
    {
        var rows = await _db.DataRegisterCurrencies.AsNoTracking()
            .OrderBy(x => x.CurrencyNo)
            .ThenBy(x => x.CurrencyName)
            .Select(x => new RegisterCurrencyDto
            {
                id = x.Id,
                currencyName = x.CurrencyName,
                currencyShortName = x.CurrencyShortName,
                currencySymbol = x.CurrencySymbol,
                currencyNo = x.CurrencyNo,
                baseCurrency = x.BaseCurrency,
                currencyStatus = x.CurrencyStatus,
            })
            .ToListAsync(ct);

        Response.Headers["Content-Range"] = $"registerCurrencies 0-{Math.Max(rows.Count - 1, 0)}/{rows.Count}";
        return Ok(rows);
    }

    public sealed class RegisterCurrencyDto
    {
        public int id { get; set; }
        public string currencyName { get; set; } = "";
        public string currencyShortName { get; set; } = "";
        public string currencySymbol { get; set; } = "";
        public int currencyNo { get; set; }
        public bool baseCurrency { get; set; }
        public bool? currencyStatus { get; set; }
    }
}
