using System.Net;
using System.Security.Claims;
using FbrSmartApp.Api.Services;

namespace FbrSmartApp.Api.Middleware;

/// <summary>
/// Requires authenticated API calls to include <see cref="HttpHeaderNames.ActiveAppId"/> matching a user allowed-app claim.
/// Anonymous and auth-account endpoints are skipped.
/// </summary>
public sealed class ActiveAppHeaderMiddleware
{
    private static readonly PathString[] ExcludedPrefixes =
    [
        new("/api/auth/login"),
        new("/api/auth/refresh"),
        new("/api/auth/register-company"),
        new("/api/auth/logout"),
        new("/api/auth/me"),
    ];

    private readonly RequestDelegate _next;
    private readonly ILogger<ActiveAppHeaderMiddleware> _logger;

    public ActiveAppHeaderMiddleware(RequestDelegate next, ILogger<ActiveAppHeaderMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path;
        if (!path.StartsWithSegments("/api"))
        {
            await _next(context);
            return;
        }

        if (path.StartsWithSegments("/api/admin"))
        {
            await _next(context);
            return;
        }

        if (IsExcluded(path))
        {
            await _next(context);
            return;
        }

        if (context.User?.Identity?.IsAuthenticated != true)
        {
            await _next(context);
            return;
        }

        if (!context.Request.Headers.TryGetValue(HttpHeaderNames.ActiveAppId, out var raw) ||
            string.IsNullOrWhiteSpace(raw))
        {
            _logger.LogWarning(
                "Active app header missing for {Method} {Path} user {UserId}",
                context.Request.Method,
                path,
                context.User.FindFirstValue(ClaimTypes.NameIdentifier));
            context.Response.StatusCode = (int)HttpStatusCode.Forbidden;
            await context.Response.WriteAsJsonAsync(new
            {
                code = "active_app_required",
                message = "X-Active-App-Id header is required for this request.",
            });
            return;
        }

        var requested = raw.ToString().Trim();
        var allowed = context.User.FindAll(PermissionCatalog.ClaimAllowedApp)
            .Select(c => c.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (!allowed.Contains(requested))
        {
            _logger.LogWarning(
                "Active app {App} not allowed for {Method} {Path} user {UserId}; allowed: {Allowed}",
                requested,
                context.Request.Method,
                path,
                context.User.FindFirstValue(ClaimTypes.NameIdentifier),
                string.Join(',', allowed));
            context.Response.StatusCode = (int)HttpStatusCode.Forbidden;
            await context.Response.WriteAsJsonAsync(new
            {
                code = "active_app_denied",
                message = "The selected application is not allowed for this user.",
            });
            return;
        }

        await _next(context);
    }

    private static bool IsExcluded(PathString path)
    {
        foreach (var p in ExcludedPrefixes)
        {
            if (path.StartsWithSegments(p)) return true;
        }
        return false;
    }
}
