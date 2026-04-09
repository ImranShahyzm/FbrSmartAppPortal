using System.Net.Http.Headers;

namespace FbrSmartApp.Api.Services.Fbr;

public sealed class FbrPdiClient : IFbrPdiClient
{
    private readonly IHttpClientFactory _httpClientFactory;

    public FbrPdiClient(IHttpClientFactory httpClientFactory) =>
        _httpClientFactory = httpClientFactory;

    public async Task<string> GetAsync(string relativePathAndQuery, string bearerToken, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient(nameof(FbrPdiClient));
        var path = relativePathAndQuery.TrimStart('/');
        using var req = new HttpRequestMessage(HttpMethod.Get, path);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken.Trim());
        using var res = await client.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);
        res.EnsureSuccessStatusCode();
        return await res.Content.ReadAsStringAsync(ct);
    }
}
