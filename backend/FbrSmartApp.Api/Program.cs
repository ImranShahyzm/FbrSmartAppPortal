using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using FbrSmartApp.Api.Auth;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Middleware;
using FbrSmartApp.Api.Services;
using FbrSmartApp.Api.Services.RecordRules;
using Microsoft.AspNetCore.Authorization;
using FbrSmartApp.Api.Services.Fbr;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("Default");
    options.UseSqlServer(connectionString);
});

builder.Services.AddDbContext<AdminPortalDbContext>(options =>
{
    var cs = builder.Configuration.GetConnectionString("AdminPortal");
    options.UseSqlServer(cs);
});

builder.Services.Configure<AuthOptions>(builder.Configuration.GetSection("Auth"));
builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection("Smtp"));
builder.Services.Configure<AdminPortalSeedData.AdminPortalOptions>(builder.Configuration.GetSection("AdminPortal"));
builder.Services.Configure<AdminAuthOptions>(builder.Configuration.GetSection("AdminAuth"));
builder.Services.AddScoped<PasswordHasher>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<AdminTokenService>();
builder.Services.AddScoped<IRegistrationEmailSender, RegistrationEmailSender>();

// FBR gateway often returns gzip/deflate; without decompression the body can read empty or as garbage.
// Match legacy Framework client: HttpClientHandler.AutomaticDecompression + Postman-like User-Agent.
builder.Services.AddHttpClient(nameof(FbrDigitalInvoicingClient))
    .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
    {
        AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate,
    })
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(60);
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Postman.Now/1.0");
    });
builder.Services.AddScoped<IFbrDigitalInvoicingClient, FbrDigitalInvoicingClient>();

builder.Services.AddHttpClient(nameof(FbrPdiClient), client =>
{
    client.BaseAddress = new Uri("https://gw.fbr.gov.pk/");
    client.Timeout = TimeSpan.FromSeconds(120);
});
builder.Services.AddScoped<IFbrPdiClient, FbrPdiClient>();
builder.Services.AddScoped<IFbrPdiSyncService, FbrPdiSyncService>();
builder.Services.AddScoped<IFbrInvoiceExcelImportService, FbrInvoiceExcelImportService>();

builder.Services.Configure<FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = 20_000_000;
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var authOptions = builder.Configuration.GetSection("Auth").Get<AuthOptions>()
            ?? throw new InvalidOperationException("Missing Auth configuration section.");

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(authOptions.JwtSigningKey)
            ),
            ValidateIssuer = true,
            ValidIssuer = authOptions.JwtIssuer,
            ValidateAudience = true,
            ValidAudience = authOptions.JwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
        };
    })
    .AddJwtBearer("AdminJwt", options =>
    {
        var authOptions = builder.Configuration.GetSection("AdminAuth").Get<AdminAuthOptions>()
            ?? throw new InvalidOperationException("Missing AdminAuth configuration section.");

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(authOptions.JwtSigningKey)
            ),
            ValidateIssuer = true,
            ValidIssuer = authOptions.JwtIssuer,
            ValidateAudience = true,
            ValidAudience = authOptions.JwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
        };
    });

builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<RecordRulesUserVersionCache>();
builder.Services.AddScoped<EffectivePermissionsService>();
builder.Services.AddScoped<RecordRulesService>();
builder.Services.AddScoped<RecordRuleFieldDiscoveryService>();
builder.Services.AddScoped<AppRecordMessageService>();
builder.Services.AddAuthorization();

var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
if (corsOrigins.Length == 0)
{
    corsOrigins =
    [
        "http://localhost:8000",
        "http://localhost:5227",
        "https://localhost:5227",
    ];
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("AppCors", policy =>
    {
        policy
            .WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .WithExposedHeaders("Content-Range");
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("AppCors");

app.UseDefaultFiles();
app.UseStaticFiles();
// Serve uploaded logos from /uploads/*
var uploadsRoot = Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsRoot);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsRoot),
    RequestPath = "/uploads",
});

// Return JSON error bodies for API exceptions (helps react-admin display real errors).
app.Use(async (ctx, next) =>
{
    try
    {
        await next();
    }
    catch (UnauthorizedAccessException)
    {
        if (!ctx.Response.HasStarted)
        {
            ctx.Response.Clear();
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsync("{\"message\":\"Unauthorized\"}");
        }
    }
    catch (Exception ex)
    {
        if (!ctx.Response.HasStarted)
        {
            ctx.Response.Clear();
            ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
            ctx.Response.ContentType = "application/json";
            var msg = app.Environment.IsDevelopment() ? ex.ToString() : "Internal Server Error";
            msg = msg.Replace("\\", "\\\\").Replace("\"", "\\\"");
            await ctx.Response.WriteAsync($"{{\"message\":\"{msg}\"}}");
        }
    }
});

app.UseAuthentication();
app.UseMiddleware<ActiveAppHeaderMiddleware>();
app.UseMiddleware<CompanyActivationMiddleware>();
app.UseAuthorization();

app.MapControllers();
app.MapFallbackToFile("index.html");

// Ensure DB exists (dev convenience). In production, use migrations.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (app.Environment.IsDevelopment())
    {
        await db.Database.EnsureCreatedAsync();
        await SchemaUpgrader.ApplyAsync(db);
    }
    else
    {
        await db.Database.MigrateAsync();
    }
    await SeedData.EnsureSeededAsync(scope.ServiceProvider);

    var adminDb = scope.ServiceProvider.GetRequiredService<AdminPortalDbContext>();
    await adminDb.Database.EnsureCreatedAsync();
    await AdminPortalSchemaUpgrader.ApplyAsync(adminDb);
    await AdminPortalSeedData.EnsureSeededAsync(scope.ServiceProvider);
}

app.Run();
