namespace HospitalQueue.Controllers;

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
    private static readonly List<object> _auditLogs = new()
    {
        new
        {
            id = "audit-init",
            timestamp = DateTime.UtcNow.AddMinutes(-45).ToString("o"),
            action = "SYSTEM_INITIALIZE",
            description = "C# ASP.NET Core Queue Engine & Security System Initialized",
            ipAddress = "127.0.0.1",
            userAgent = "HospitalSystem/1.0"
        }
    };

    public AuthController(HospitalDbContext db)
    {
        _db = db;
    }

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
            // If demo credentials or new quick login
            user = new UserAccount
            {
                Id = $"usr-{Guid.NewGuid():N}"[..12],
                Email = email,
                FullName = email.Split('@')[0],
                Role = request.Role ?? (email.Contains("dr.") ? "Doctor" : "Patient"),
                DepartmentId = request.DepartmentId ?? "cardiology",
                AvatarUrl = $"https://api.dicebear.com/7.x/initials/svg?seed={Uri.EscapeDataString(email)}",
                CreatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow
            };
            _db.Users.Add(user);
        }
        else
        {
            // Verify password if set
            if (!string.IsNullOrEmpty(user.PasswordHash) && !string.IsNullOrEmpty(user.PasswordSalt))
            {
                bool isValid = AuthUtils.VerifyPassword(request.Password, user.PasswordHash, user.PasswordSalt);
                if (!isValid)
                {
                    return Unauthorized(new { message = "Invalid email or password." });
                }
            }

            user.LastLoginAt = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(request.Role) && request.Role != user.Role)
            {
                user.Role = request.Role;
            }
            if (!string.IsNullOrWhiteSpace(request.DepartmentId))
            {
                user.DepartmentId = request.DepartmentId;
            }
        }

        await _db.SaveChangesAsync();

        var claimsPrincipal = AuthUtils.CreateClaimsPrincipal(user);
        var authProperties = AuthUtils.CreateAuthProperties(24);
        var token = AuthUtils.GenerateJwtToken(user);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            claimsPrincipal,
            authProperties
        );

        _auditLogs.Add(new
        {
            id = $"audit-{Guid.NewGuid():N}"[..10],
            timestamp = DateTime.UtcNow.ToString("o"),
            action = "USER_LOGIN",
            description = $"User {user.Email} signed in ({user.Role})",
            userId = user.Id,
            ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1"
        });

        return Ok(new
        {
            message = "Login successful.",
            token,
            user = new
            {
                user.Id,
                user.Email,
                name = user.FullName,
                fullName = user.FullName,
                user.Role,
                user.DepartmentId,
                user.AvatarUrl,
                user.CreatedAt,
                user.LastLoginAt
            },
            expiresAt = authProperties.ExpiresUtc
        });
    }

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
            Id = $"usr-{Guid.NewGuid():N}"[..12],
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
        var token = AuthUtils.GenerateJwtToken(newUser);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            claimsPrincipal,
            authProperties
        );

        return Created($"/api/auth/me", new
        {
            message = "Account created and session authenticated.",
            token,
            user = new
            {
                newUser.Id,
                newUser.Email,
                name = newUser.FullName,
                fullName = newUser.FullName,
                newUser.Role,
                newUser.DepartmentId,
                newUser.AvatarUrl,
                newUser.CreatedAt,
                newUser.LastLoginAt
            },
            expiresAt = authProperties.ExpiresUtc
        });
    }

    [HttpPost("google")]
    public async Task<IActionResult> GoogleAuth([FromBody] GoogleAuthRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);

        if (user == null)
        {
            user = new UserAccount
            {
                Id = $"usr-{Guid.NewGuid():N}"[..12],
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
            if (!string.IsNullOrWhiteSpace(request.DepartmentId)) user.DepartmentId = request.DepartmentId;
        }

        await _db.SaveChangesAsync();

        var claimsPrincipal = AuthUtils.CreateClaimsPrincipal(user);
        var authProperties = AuthUtils.CreateAuthProperties(24);
        var token = AuthUtils.GenerateJwtToken(user);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            claimsPrincipal,
            authProperties
        );

        return Ok(new
        {
            message = "Google OAuth login successful.",
            token,
            user = new
            {
                user.Id,
                user.Email,
                name = user.FullName,
                fullName = user.FullName,
                user.Role,
                user.DepartmentId,
                user.AvatarUrl,
                user.CreatedAt,
                user.LastLoginAt
            },
            expiresAt = authProperties.ExpiresUtc
        });
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        string? userId = null;

        // 1. Try Bearer token from header
        var authHeader = Request.Headers.Authorization.ToString();
        if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = authHeader["Bearer ".Length..].Trim();
            var (valid, jwtUid, _, _) = AuthUtils.ValidateJwtToken(token);
            if (valid)
            {
                userId = jwtUid;
            }
        }

        // 2. Try cookie identity
        if (userId == null && (User.Identity?.IsAuthenticated ?? false))
        {
            userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }

        if (userId == null)
        {
            return Unauthorized(new { message = "Not authenticated" });
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            return Unauthorized(new { message = "User not found" });
        }

        var jwtToken = AuthUtils.GenerateJwtToken(user);

        return Ok(new
        {
            isAuthenticated = true,
            token = jwtToken,
            user = new
            {
                user.Id,
                user.Email,
                name = user.FullName,
                fullName = user.FullName,
                user.Role,
                user.DepartmentId,
                user.AvatarUrl,
                user.CreatedAt,
                user.LastLoginAt
            },
            session = new
            {
                sessionId = $"sess-{user.Id[..6]}",
                issuedAt = DateTime.UtcNow.AddMinutes(-10).ToString("o"),
                expiresAt = DateTime.UtcNow.AddHours(24).ToString("o")
            }
        });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok(new { message = "Logged out successfully." });
    }

    [HttpGet("sessions")]
    public IActionResult GetSessions()
    {
        var sessions = new List<object>
        {
            new
            {
                id = "sess-current",
                ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
                userAgent = Request.Headers.UserAgent.ToString(),
                createdAt = DateTime.UtcNow.AddHours(-1).ToString("o"),
                lastActiveAt = DateTime.UtcNow.ToString("o"),
                isCurrent = true
            }
        };

        return Ok(new
        {
            count = sessions.Count,
            sessions
        });
    }

    [HttpGet("audit-logs")]
    public IActionResult GetAuditLogs()
    {
        return Ok(new
        {
            logs = _auditLogs.TakeLast(50).Reverse().ToList()
        });
    }

    [HttpPost("audit-logs")]
    public IActionResult CreateAuditLog([FromBody] dynamic body)
    {
        _auditLogs.Add(new
        {
            id = $"audit-{Guid.NewGuid():N}"[..10],
            timestamp = DateTime.UtcNow.ToString("o"),
            action = "AUDIT_EVENT",
            details = body?.ToString() ?? ""
        });
        return Ok(new { success = true });
    }
}
