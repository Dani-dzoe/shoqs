namespace HospitalQueue.Utils;

using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using HospitalQueue.Models;

public static class AuthUtils
{
    public static string HashPassword(string password, out string salt)
    {
        byte[] saltBytes = RandomNumberGenerator.GetBytes(16);
        salt = Convert.ToBase64String(saltBytes);
        using var pbkdf2 = new Rfc2898DeriveBytes(password, saltBytes, 100000, HashAlgorithmName.SHA256);
        byte[] hash = pbkdf2.GetBytes(32);
        return Convert.ToBase64String(hash);
    }

    public static bool VerifyPassword(string password, string? storedHash, string? storedSalt)
    {
        if (string.IsNullOrEmpty(storedHash) || string.IsNullOrEmpty(storedSalt))
            return false;

        try
        {
            byte[] saltBytes = Convert.FromBase64String(storedSalt);
            using var pbkdf2 = new Rfc2898DeriveBytes(password, saltBytes, 100000, HashAlgorithmName.SHA256);
            byte[] hash = pbkdf2.GetBytes(32);
            return CryptographicOperations.FixedTimeEquals(hash, Convert.FromBase64String(storedHash));
        }
        catch
        {
            return false;
        }
    }

    public static ClaimsPrincipal CreateClaimsPrincipal(UserAccount user)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("DepartmentId", user.DepartmentId ?? ""),
            new Claim("AvatarUrl", user.AvatarUrl),
            new Claim("SessionIssuedAt", DateTime.UtcNow.ToString("o"))
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        return new ClaimsPrincipal(identity);
    }

    public static AuthenticationProperties CreateAuthProperties(int expiryHours = 24)
    {
        return new AuthenticationProperties
        {
            IsPersistent = true,
            ExpiresUtc = DateTimeOffset.UtcNow.AddHours(expiryHours)
        };
    }
}
