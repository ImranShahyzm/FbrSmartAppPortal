namespace FbrSmartApp.Api.Models;

public sealed class FbrSaleType
{
    public int Id { get; set; }
    public string Description { get; set; } = "";
    public bool IsActive { get; set; } = true;
}

