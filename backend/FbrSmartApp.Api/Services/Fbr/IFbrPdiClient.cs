namespace FbrSmartApp.Api.Services.Fbr;

public interface IFbrPdiClient
{
    Task<string> GetAsync(string relativePathAndQuery, string bearerToken, CancellationToken ct);
}
