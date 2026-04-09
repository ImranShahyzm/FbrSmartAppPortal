namespace FbrSmartApp.Api.Services.Fbr;

public interface IFbrDigitalInvoicingClient
{
    /// <param name="useSandboxUrls">True when company uses sandbox FBR endpoints (_sb).</param>
    Task<FbrApiResponseDto> ValidateAsync(FbrDigitalInvoicePayload payload, string bearerToken, bool useSandboxUrls, CancellationToken ct);

    /// <param name="useSandboxUrls">True when company uses sandbox FBR endpoints (_sb).</param>
    Task<FbrApiResponseDto> PostAsync(FbrDigitalInvoicePayload payload, string bearerToken, bool useSandboxUrls, CancellationToken ct);
}
