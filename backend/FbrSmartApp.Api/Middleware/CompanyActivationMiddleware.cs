using FbrSmartApp.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace FbrSmartApp.Api.Middleware;

/// <summary>
/// Blocks authenticated API calls for users whose company is not activated yet,
/// except auth endpoints needed to stay signed in or read identity.
/// </summary>
public sealed class CompanyActivationMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext ctx, IServiceProvider services)
    {
        if (HttpMethods.IsOptions(ctx.Request.Method))
        {
            await next(ctx);
            return;
        }

        var path = ctx.Request.Path;
        if (!path.StartsWithSegments("/api"))
        {
            await next(ctx);
            return;
        }

        // Admin portal endpoints are governed by separate auth/authorization.
        if (path.StartsWithSegments("/api/admin"))
        {
            await next(ctx);
            return;
        }

        if (path.StartsWithSegments("/api/auth/login") ||
            path.StartsWithSegments("/api/auth/register-company") ||
            path.StartsWithSegments("/api/public"))
        {
            await next(ctx);
            return;
        }

        if (ctx.User?.Identity?.IsAuthenticated != true)
        {
            await next(ctx);
            return;
        }

        if (path.StartsWithSegments("/api/auth/me") ||
            path.StartsWithSegments("/api/auth/logout") ||
            path.StartsWithSegments("/api/auth/refresh"))
        {
            await next(ctx);
            return;
        }

        var companyIdRaw = ctx.User.FindFirst("companyId")?.Value;
        if (!int.TryParse(companyIdRaw, out var companyId))
        {
            await next(ctx);
            return;
        }

        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var activated = await db.Companies.AsNoTracking()
            .Where(c => c.Id == companyId)
            .Select(c => (bool?)c.IsActivated)
            .FirstOrDefaultAsync(ctx.RequestAborted);

        if (activated == true)
        {
            await next(ctx);
            return;
        }

        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
        ctx.Response.ContentType = "application/json; charset=utf-8";
        await ctx.Response.WriteAsync(
            "{\"message\":\"Company is not activated yet.\"}",
            ctx.RequestAborted);
    }
}
