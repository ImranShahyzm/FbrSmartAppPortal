using System.IO;
using System.Linq;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace FbrSmartApp.Api.Services.Fbr;

public sealed class FbrDigitalInvoicingClient : IFbrDigitalInvoicingClient
{
    private readonly IHttpClientFactory _httpClientFactory;

    public FbrDigitalInvoicingClient(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public Task<FbrApiResponseDto> ValidateAsync(FbrDigitalInvoicePayload payload, string bearerToken, bool useSandboxUrls, CancellationToken ct) =>
        SendAsync(payload, bearerToken, useSandboxUrls, validate: true, ct);

    public Task<FbrApiResponseDto> PostAsync(FbrDigitalInvoicePayload payload, string bearerToken, bool useSandboxUrls, CancellationToken ct) =>
        SendAsync(payload, bearerToken, useSandboxUrls, validate: false, ct);

    private static string Url(bool validate, bool useSandboxUrls)
    {
        const string baseUrl = "https://gw.fbr.gov.pk/di_data/v1/di/";
        if (validate)
            return useSandboxUrls ? $"{baseUrl}validateinvoicedata_sb" : $"{baseUrl}validateinvoicedata";
        return useSandboxUrls ? $"{baseUrl}postinvoicedata_sb" : $"{baseUrl}postinvoicedata";
    }

    private async Task<FbrApiResponseDto> SendAsync(
        FbrDigitalInvoicePayload payload,
        string bearerToken,
        bool useSandboxUrls,
        bool validate,
        CancellationToken ct
    )
    {
        var client = _httpClientFactory.CreateClient(nameof(FbrDigitalInvoicingClient));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        if (!client.DefaultRequestHeaders.UserAgent.Any())
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Postman.Now/1.0");


        var json = JsonSerializer.Serialize(payload, FbrJsonSerializerOptions.ForOutboundPayload);
        using var content = new StringContent(json, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false), "application/json");
        using var response = await client.PostAsync(Url(validate, useSandboxUrls), content, ct);

        string body;
        if (response.IsSuccessStatusCode)
        {
            await response.Content.LoadIntoBufferAsync(ct);
            body = await response.Content.ReadAsStringAsync(ct);
            if (string.IsNullOrWhiteSpace(body))
            {
                await using var stream = await response.Content.ReadAsStreamAsync(ct);
                using var reader = new StreamReader(stream, Encoding.UTF8, leaveOpen: true);
                body = await reader.ReadToEndAsync(ct);
            }
        }
        else
            body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            return new FbrApiResponseDto
            {
                ValidationResponse = new FbrValidationResponseDto
                {
                    StatusCode = "98",
                    Status = "Failed",
                    Error = $"HTTP {(int)response.StatusCode}: {body}",
                },
            };
        }

        if (string.IsNullOrWhiteSpace(body) || (!body.TrimStart().StartsWith('{') && !body.TrimStart().StartsWith('[')))
        {
            var enc = string.Join(", ", response.Content.Headers.ContentEncoding);
            var len = response.Content.Headers.ContentLength;
            var prefix = body.Length == 0 ? "(empty)" : body.Length <= 120 ? body : body[..120] + "…";
            return new FbrApiResponseDto
            {
                ValidationResponse = new FbrValidationResponseDto
                {
                    StatusCode = "99",
                    Status = "Failed",
                    Error =
                        $"Empty or non-JSON response from FBR (Content-Encoding: [{enc}], Content-Length: {len?.ToString() ?? "n/a"}). Body prefix: {prefix}",
                },
            };
        }

        FbrApiResponseDto? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<FbrApiResponseDto>(body, FbrJsonSerializerOptions.ForApiResponseDeserialize);
        }
        catch (JsonException)
        {
            var snippet = body.Length <= 400 ? body : body[..400] + "…";
            return new FbrApiResponseDto
            {
                ValidationResponse = new FbrValidationResponseDto
                {
                    StatusCode = "94",
                    Status = "Failed",
                    Error = $"Failed to parse FBR response JSON. Body starts with: {snippet}",
                },
            };
        }

        parsed ??= new FbrApiResponseDto();
        parsed.ValidationResponse ??= new FbrValidationResponseDto
        {
            StatusCode = "94",
            Status = "Failed",
            Error = "validationResponse missing in FBR response",
        };

        return parsed;
    }
}
