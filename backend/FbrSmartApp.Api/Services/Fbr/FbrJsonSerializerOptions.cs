using System.Text.Json;
using System.Text.Json.Serialization;

namespace FbrSmartApp.Api.Services.Fbr;

/// <summary>Shared JSON options for FBR DI payloads and stored API snapshots (human-readable in DB/logs).</summary>
public static class FbrJsonSerializerOptions
{
    /// <summary>Outbound validate/post body — indented for FBR compatibility and easier diagnostics.</summary>
    public static readonly JsonSerializerOptions ForOutboundPayload = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary>Persisted FbrLastResponseJson copies on invoices.</summary>
    public static readonly JsonSerializerOptions ForStoredSnapshot = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public static readonly JsonSerializerOptions ForApiResponseDeserialize = new()
    {
        PropertyNameCaseInsensitive = true,
        AllowTrailingCommas = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
        ReadCommentHandling = JsonCommentHandling.Skip,
    };
}
