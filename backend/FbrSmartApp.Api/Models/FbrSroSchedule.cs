namespace FbrSmartApp.Api.Models;

public sealed class FbrSroSchedule
{
    public int Id { get; set; }
    public string SroDesc { get; set; } = "";
    public string? SerNo { get; set; }
    public bool IsActive { get; set; } = true;
}

