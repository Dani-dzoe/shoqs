// ==============================================================================
// Smart Hospital Queue Optimization System - C# / ASP.NET Core 8 Web API
// Real-Time Engine: ASP.NET Core SignalR
// Database: Entity Framework Core (In-Memory Database)
// Architecture: Controllers, Models, Utils, Db, Hubs
// ==============================================================================

using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.EntityFrameworkCore;
using HospitalQueue.Db;
using HospitalQueue.Hubs;
using HospitalQueue.Utils;

var builder = WebApplication.CreateBuilder(args);

// -----------------------------------------------------------------------------
// 1. Dependency Injection & Service Configuration
// -----------------------------------------------------------------------------
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddDbContext<HospitalDbContext>(options =>
    options.UseInMemoryDatabase("HospitalQueueDb"));

builder.Services.AddSingleton<QueueEventsBroadcaster>();
builder.Services.AddSignalR();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Configure Stateful Session-Based Cookie Authentication & Google OAuth
builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = GoogleDefaults.AuthenticationScheme;
})
.AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, options =>
{
    options.Cookie.Name = "hospital_session_token";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromHours(24);
    options.SlidingExpiration = true;
    options.Events.OnRedirectToLogin = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
})
.AddGoogle(GoogleDefaults.AuthenticationScheme, options =>
{
    options.ClientId = builder.Configuration["Authentication:Google:ClientId"] ?? "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
    options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"] ?? "YOUR_GOOGLE_CLIENT_SECRET";
    options.SaveTokens = true;
});

// Role-Based Authorization Policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("DoctorOnly", policy => policy.RequireRole("Doctor", "Admin"));
    options.AddPolicy("StaffOnly", policy => policy.RequireRole("Doctor", "Nurse", "Admin"));
});

var app = builder.Build();

// -----------------------------------------------------------------------------
// 2. Database Seeding on Startup
// -----------------------------------------------------------------------------
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<HospitalDbContext>();
    DbSeeder.SeedDatabase(db);
}

// -----------------------------------------------------------------------------
// 3. Middleware Pipeline
// -----------------------------------------------------------------------------
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.UseDefaultFiles();
app.UseStaticFiles();

// -----------------------------------------------------------------------------
// 4. Controller & Hub Route Mappings
// -----------------------------------------------------------------------------
app.MapControllers();
app.MapHub<QueueHub>("/hubs/queue");

app.Run();
