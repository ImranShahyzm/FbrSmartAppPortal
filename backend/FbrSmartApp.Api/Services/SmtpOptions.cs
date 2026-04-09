namespace FbrSmartApp.Api.Services;

public sealed class SmtpOptions
{
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public string UserName { get; set; } = "";
    public string Password { get; set; } = "";
    public string FromAddress { get; set; } = "";
    public string FromDisplayName { get; set; } = "FBR Smart Application";
    public bool EnableSsl { get; set; } = true;
}
