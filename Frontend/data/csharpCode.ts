export const CSPROJ_CODE = `<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <RootNamespace>HospitalQueue</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="8.0.8" />
    <PackageReference Include="Microsoft.AspNetCore.SignalR.Common" Version="8.0.8" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.InMemory" Version="8.0.8" />
    <PackageReference Include="Microsoft.AspNetCore.Authentication.Google" Version="8.0.8" />
  </ItemGroup>

</Project>`;

export const PROGRAM_CS_CODE = `// ==============================================================================
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

var builder = WebApplication.CreateBuilder(args);

// -----------------------------------------------------------------------------
// 1. Dependency Injection & Service Configuration
// -----------------------------------------------------------------------------
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddDbContext<HospitalDbContext>(options =>
    options.UseInMemoryDatabase("HospitalQueueDb"));

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

app.Run();`;

export const AUTH_CONTROLLER_CODE = `namespace HospitalQueue.Controllers;

using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HospitalQueue.Db;
using HospitalQueue.Models;
using HospitalQueue.Utils;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly HospitalDbContext _db;

    public AuthController(HospitalDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// POST /api/auth/login
    /// Normal email and password login, establishing an authenticated session cookie.
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);

        if (user == null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        // Verify password against stored PBKDF2 hash & salt
        bool isValid = AuthUtils.VerifyPassword(request.Password, user.PasswordHash, user.PasswordSalt);
        if (!isValid)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        user.LastLoginAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(request.Role) && request.Role != user.Role)
        {
            user.Role = request.Role;
        }
        await _db.SaveChangesAsync();

        var claimsPrincipal = AuthUtils.CreateClaimsPrincipal(user);
        var authProperties = AuthUtils.CreateAuthProperties(24);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            claimsPrincipal,
            authProperties
        );

        return Ok(new
        {
            message = "Login successful.",
            user = new
            {
                user.Id,
                user.Email,
                user.FullName,
                user.Role,
                user.DepartmentId,
                user.AvatarUrl,
                user.CreatedAt,
                user.LastLoginAt
            },
            expiresAt = authProperties.ExpiresUtc
        });
    }

    /// <summary>
    /// POST /api/auth/signup
    /// Normal user registration with name, email, password, and clinical role.
    /// </summary>
    [HttpPost("signup")]
    public async Task<IActionResult> Signup([FromBody] SignupRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var existingUser = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);
        if (existingUser != null)
        {
            return Conflict(new { message = "An account with this email address already exists. Please sign in." });
        }

        var passwordHash = AuthUtils.HashPassword(request.Password, out string passwordSalt);
        var role = !string.IsNullOrWhiteSpace(request.Role) ? request.Role : (email.Contains("dr.") ? "Doctor" : "Patient");

        var newUser = new UserAccount
        {
            Id = Guid.NewGuid().ToString(),
            Email = email,
            FullName = request.FullName.Trim(),
            AvatarUrl = $"https://api.dicebear.com/7.x/initials/svg?seed={Uri.EscapeDataString(request.FullName.Trim())}",
            Role = role,
            DepartmentId = role == "Doctor" ? (request.DepartmentId ?? "cardiology") : request.DepartmentId,
            PasswordHash = passwordHash,
            PasswordSalt = passwordSalt,
            CreatedAt = DateTime.UtcNow,
            LastLoginAt = DateTime.UtcNow
        };

        _db.Users.Add(newUser);
        await _db.SaveChangesAsync();

        var claimsPrincipal = AuthUtils.CreateClaimsPrincipal(newUser);
        var authProperties = AuthUtils.CreateAuthProperties(24);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            claimsPrincipal,
            authProperties
        );

        return Created($"/api/auth/me", new
        {
            message = "Account created and session authenticated.",
            user = new
            {
                newUser.Id,
                newUser.Email,
                newUser.FullName,
                newUser.Role,
                newUser.DepartmentId,
                newUser.AvatarUrl,
                newUser.CreatedAt,
                newUser.LastLoginAt
            },
            expiresAt = authProperties.ExpiresUtc
        });
    }

    /// <summary>
    /// POST /api/auth/google
    /// Authenticate or register with Google profile, setting an encrypted stateful session cookie.
    /// </summary>
    [HttpPost("google")]
    public async Task<IActionResult> GoogleAuth([FromBody] GoogleAuthRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);

        if (user == null)
        {
            user = new UserAccount
            {
                Id = Guid.NewGuid().ToString(),
                Email = email,
                FullName = string.IsNullOrWhiteSpace(request.FullName) ? email.Split('@')[0] : request.FullName,
                AvatarUrl = request.AvatarUrl ?? $"https://api.dicebear.com/7.x/initials/svg?seed={Uri.EscapeDataString(email)}",
                Role = request.Role ?? (email.Contains("dr.") ? "Doctor" : "Patient"),
                DepartmentId = request.DepartmentId,
                GoogleSub = request.GoogleSub ?? $"google-sub-{Guid.NewGuid():N}",
                CreatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow
            };
            _db.Users.Add(user);
        }
        else
        {
            user.LastLoginAt = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(request.Role)) user.Role = request.Role;
        }

        await _db.SaveChangesAsync();

        var claimsPrincipal = AuthUtils.CreateClaimsPrincipal(user);
        var authProperties = AuthUtils.CreateAuthProperties(24);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            claimsPrincipal,
            authProperties
        );

        return Ok(new
        {
            Message = "Google OAuth login successful. Session cookie issued.",
            User = user,
            ExpiresAt = authProperties.ExpiresUtc
        });
    }

    /// <summary>
    /// GET /api/auth/me
    /// Read current session cookie and validate user identity.
    /// </summary>
    [HttpGet("me")]
    public IActionResult GetMe()
    {
        if (!User.Identity?.IsAuthenticated ?? true)
        {
            return Unauthorized();
        }

        var claims = User.Claims.ToDictionary(c => c.Type, c => c.Value);
        return Ok(new
        {
            IsAuthenticated = true,
            UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            Email = User.FindFirst(ClaimTypes.Email)?.Value,
            Name = User.FindFirst(ClaimTypes.Name)?.Value,
            Role = User.FindFirst(ClaimTypes.Role)?.Value,
            DepartmentId = claims.GetValueOrDefault("DepartmentId"),
            AvatarUrl = claims.GetValueOrDefault("AvatarUrl"),
            SessionIssuedAt = claims.GetValueOrDefault("SessionIssuedAt")
        });
    }

    /// <summary>
    /// POST /api/auth/logout
    /// Terminate session and clear cookie.
    /// </summary>
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok(new { Message = "Logged out successfully. Session cookie revoked." });
    }
}`;

export const QUEUE_CONTROLLER_CODE = `namespace HospitalQueue.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using HospitalQueue.Db;
using HospitalQueue.Hubs;
using HospitalQueue.Models;
using HospitalQueue.Utils;

[ApiController]
[Route("api/queue")]
public class QueueController : ControllerBase
{
    private readonly HospitalDbContext _db;
    private readonly IHubContext<QueueHub> _hubContext;

    public QueueController(HospitalDbContext db, IHubContext<QueueHub> hubContext)
    {
        _db = db;
        _hubContext = hubContext;
    }

    [HttpGet("snapshot/{departmentId}")]
    public async Task<IActionResult> GetSnapshot(string departmentId)
    {
        var now = DateTime.UtcNow;
        var department = await _db.Departments.FindAsync(departmentId);
        if (department == null) return NotFound(new { message = "Department not found" });

        var allActiveTickets = await _db.Tickets
            .Where(t => t.DepartmentId == departmentId && 
                       (t.Status == TicketStatus.Waiting || t.Status == TicketStatus.Called || t.Status == TicketStatus.InConsultation))
            .ToListAsync();

        foreach (var ticket in allActiveTickets.Where(t => t.Status == TicketStatus.Waiting))
        {
            ticket.RecalculatePriority(now);
        }

        var waitingQueue = allActiveTickets
            .Where(t => t.Status == TicketStatus.Waiting)
            .OrderByDescending(t => t.PriorityScore)
            .ThenBy(t => t.CreatedAt)
            .ToList();

        var currentlyCalled = allActiveTickets
            .Where(t => t.Status == TicketStatus.Called || t.Status == TicketStatus.InConsultation)
            .OrderByDescending(t => t.CalledAt ?? t.CreatedAt)
            .ToList();

        return Ok(new QueueSnapshotDto
        {
            DepartmentId = departmentId,
            DepartmentName = department.Name,
            GeneratedAt = now,
            WaitingQueue = waitingQueue,
            CurrentlyCalled = currentlyCalled,
            EstimatedWaitMinutes = waitingQueue.Count * 12
        });
    }

    [HttpPost("issue")]
    public async Task<IActionResult> IssueTicket([FromBody] IssueTicketRequest request)
    {
        var department = await _db.Departments.FindAsync(request.DepartmentId);
        if (department == null) return NotFound(new { message = "Department not found" });

        department.LastSequenceNumber += 1;
        var ticketCode = $"{department.Prefix}-{department.LastSequenceNumber:D3}";

        var ticket = new Ticket
        {
            Id = Guid.NewGuid().ToString(),
            DepartmentId = department.Id,
            TicketCode = ticketCode,
            PatientName = request.PatientName.Trim(),
            Urgency = request.Urgency,
            HasAppointment = request.HasAppointment,
            Status = TicketStatus.Waiting,
            CreatedAt = DateTime.UtcNow,
            EstimatedWaitMinutes = 15
        };

        ticket.RecalculatePriority(DateTime.UtcNow);
        _db.Tickets.Add(ticket);
        await _db.SaveChangesAsync();

        await _hubContext.Clients.Group(department.Id).SendAsync("TicketIssued", ticket);
        await _hubContext.Clients.Group("LobbyGroup").SendAsync("TicketIssued", ticket);

        return Ok(ticket);
    }

    [Authorize(Policy = "DoctorOnly")]
    [HttpPost("call-next")]
    public async Task<IActionResult> CallNext([FromBody] CallNextRequest request)
    {
        var now = DateTime.UtcNow;
        var waitingTickets = await _db.Tickets
            .Where(t => t.DepartmentId == request.DepartmentId && t.Status == TicketStatus.Waiting)
            .ToListAsync();

        if (!waitingTickets.Any())
        {
            return NotFound(new { message = "No waiting patients in this department." });
        }

        foreach (var t in waitingTickets)
        {
            t.RecalculatePriority(now);
        }

        var nextTicket = waitingTickets
            .OrderByDescending(t => t.PriorityScore)
            .ThenBy(t => t.CreatedAt)
            .First();

        nextTicket.Status = TicketStatus.Called;
        nextTicket.CalledAt = now;
        nextTicket.RoomNumber = request.RoomNumber;
        nextTicket.DoctorName = request.DoctorName;

        await _db.SaveChangesAsync();

        var callPayload = new
        {
            TicketId = nextTicket.Id,
            TicketCode = nextTicket.TicketCode,
            PatientName = nextTicket.PatientName,
            DepartmentId = nextTicket.DepartmentId,
            RoomNumber = nextTicket.RoomNumber,
            DoctorName = nextTicket.DoctorName,
            CalledAt = nextTicket.CalledAt
        };

        await _hubContext.Clients.Group(request.DepartmentId).SendAsync("PatientCalled", callPayload);
        await _hubContext.Clients.Group("LobbyGroup").SendAsync("PatientCalled", callPayload);

        return Ok(nextTicket);
    }
}`;

export const DTOS_MODELS_CODE = `namespace HospitalQueue.Models;

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

public class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    public string? Role { get; set; }
    public string? DepartmentId { get; set; }
}

public class SignupRequest
{
    [Required]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;

    public string? Role { get; set; }
    public string? DepartmentId { get; set; }
}

public class GoogleAuthRequest
{
    [Required]
    public string Email { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Role { get; set; }
    public string? DepartmentId { get; set; }
    public string? GoogleSub { get; set; }
}

public class UserAccount
{
    [Key]
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public string Role { get; set; } = "Patient";
    public string? DepartmentId { get; set; }
    public string? GoogleSub { get; set; }
    public string? PasswordHash { get; set; }
    public string? PasswordSalt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastLoginAt { get; set; } = DateTime.UtcNow;
}

public class Ticket
{
    [Key]
    public string Id { get; set; } = string.Empty;
    public string DepartmentId { get; set; } = string.Empty;
    public string TicketCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public UrgencyLevel Urgency { get; set; } = UrgencyLevel.Routine;
    public bool HasAppointment { get; set; }
    public TicketStatus Status { get; set; } = TicketStatus.Waiting;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CalledAt { get; set; }
    public string? RoomNumber { get; set; }
    public string? DoctorName { get; set; }
    public int EstimatedWaitMinutes { get; set; }
    public double PriorityScore { get; private set; }

    public void RecalculatePriority(DateTime currentUtcNow)
    {
        if (Urgency == UrgencyLevel.Emergency)
        {
            PriorityScore = 999999.0 + (currentUtcNow - CreatedAt).TotalMinutes;
            return;
        }

        var waitTimeInMinutes = Math.Max(0, (currentUtcNow - CreatedAt).TotalMinutes);
        PriorityScore = (waitTimeInMinutes * 1.5) + ((int)Urgency * 20.0) + (HasAppointment ? 15.0 : 0.0);
    }
}`;
