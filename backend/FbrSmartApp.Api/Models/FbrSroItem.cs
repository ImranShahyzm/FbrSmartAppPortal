namespace FbrSmartApp.Api.Models;

public sealed class FbrSroItem
{
    public int Id { get; set; }
    public int SroId { get; set; }
    public string SroItemDesc { get; set; } = "";
    public bool IsActive { get; set; } = true;
}

