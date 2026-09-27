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
            // First-time signup with Google profile
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

        // Issue HTTP session cookie: 'hospital_session_token'
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
}
