using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace FbrSmartApp.Api.Services;

public interface IRegistrationEmailSender
{
    /// <summary>Sends welcome / credentials email. Returns false if SMTP is not configured or send failed.</summary>
    Task<bool> SendRegistrationWelcomeAsync(
        string toAddress,
        string recipientName,
        string companyTitle,
        string signInEmail,
        string temporaryPassword,
        CancellationToken ct);

    /// <summary>Sends company activated email. Returns false if SMTP is not configured or send failed.</summary>
    Task<bool> SendCompanyActivatedAsync(
        string toAddress,
        string recipientName,
        string companyTitle,
        string signInEmail,
        CancellationToken ct);
}

public sealed class RegistrationEmailSender : IRegistrationEmailSender
{
    private readonly SmtpOptions _options;
    private readonly ILogger<RegistrationEmailSender> _logger;

    public RegistrationEmailSender(IOptions<SmtpOptions> options, ILogger<RegistrationEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task<bool> SendRegistrationWelcomeAsync(
        string toAddress,
        string recipientName,
        string companyTitle,
        string signInEmail,
        string temporaryPassword,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_options.Host) || string.IsNullOrWhiteSpace(_options.FromAddress))
        {
            _logger.LogWarning("SMTP is not configured (Smtp:Host / Smtp:FromAddress); skipping registration email.");
            return false;
        }

        if (string.IsNullOrWhiteSpace(toAddress))
            return false;

        var subject = $"Registration received — {companyTitle}";
        var body =
            $"Hello {recipientName},\r\n\r\n" +
            $"Your company \"{companyTitle}\" has been registered and is waiting for approval.\r\n\r\n" +
            $"Sign in with:\r\n" +
            $"  Email: {signInEmail}\r\n" +
            $"  Temporary password: {temporaryPassword}\r\n\r\n" +
            $"Please keep this password secure. You will be able to use the application fully once your company is activated.\r\n\r\n" +
            $"— FBR Smart Application";

        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(_options.FromAddress.Trim(), _options.FromDisplayName.Trim()),
                Subject = subject,
                Body = body,
            };
            message.To.Add(toAddress.Trim());

            using var client = new SmtpClient(_options.Host.Trim(), _options.Port)
            {
                EnableSsl = _options.EnableSsl,
            };
            if (!string.IsNullOrWhiteSpace(_options.UserName))
                client.Credentials = new NetworkCredential(_options.UserName, _options.Password);

            await client.SendMailAsync(message, ct);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send registration email to {To}", toAddress);
            return false;
        }
    }

    public async Task<bool> SendCompanyActivatedAsync(
        string toAddress,
        string recipientName,
        string companyTitle,
        string signInEmail,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_options.Host) || string.IsNullOrWhiteSpace(_options.FromAddress))
        {
            _logger.LogWarning("SMTP is not configured (Smtp:Host / Smtp:FromAddress); skipping activation email.");
            return false;
        }

        if (string.IsNullOrWhiteSpace(toAddress)) return false;

        var subject = $"Company activated — {companyTitle}";
        var body =
            $"Hello {recipientName},\r\n\r\n" +
            $"Your company \"{companyTitle}\" is now activated.\r\n\r\n" +
            $"You can sign in with:\r\n" +
            $"  Email: {signInEmail}\r\n\r\n" +
            $"— FBR Smart Application";

        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(_options.FromAddress.Trim(), _options.FromDisplayName.Trim()),
                Subject = subject,
                Body = body,
            };
            message.To.Add(toAddress.Trim());

            using var client = new SmtpClient(_options.Host.Trim(), _options.Port)
            {
                EnableSsl = _options.EnableSsl,
            };
            if (!string.IsNullOrWhiteSpace(_options.UserName))
                client.Credentials = new NetworkCredential(_options.UserName, _options.Password);

            await client.SendMailAsync(message, ct);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send activation email to {To}", toAddress);
            return false;
        }
    }
}
