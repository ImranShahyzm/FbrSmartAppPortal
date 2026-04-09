namespace FbrSmartApp.Api.Models;

public sealed class FbrRate
{
    public int Id { get; set; }
    public string RateDesc { get; set; } = "";
    public decimal? RateValue { get; set; }
    public bool IsActive { get; set; } = true;
}

