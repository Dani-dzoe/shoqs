namespace HospitalQueue.Utils;

using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using HospitalQueue.Models;

public static class AuthUtils
{
    private static readonly byte[] SecretKey = Encoding.UTF8.GetBytes("StJude-Hospital-Secure-Secret-Key-2026-ASPNetCore8!");

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

    public static string GenerateJwtToken(UserAccount user)
    {
        var header = JsonSerializer.Serialize(new { alg = "HS256", typ = "JWT" });
        var payload = JsonSerializer.Serialize(new
        {
            sub = user.Id,
            email = user.Email,
            name = user.FullName,
            role = user.Role,
            departmentId = user.DepartmentId,
            exp = DateTimeOffset.UtcNow.AddDays(7).ToUnixTimeSeconds()
        });

        var headerB64 = Base64UrlEncode(Encoding.UTF8.GetBytes(header));
        var payloadB64 = Base64UrlEncode(Encoding.UTF8.GetBytes(payload));
        var stringToSign = $"{headerB64}.{payloadB64}";

        using var hmac = new HMACSHA256(SecretKey);
        var signature = Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes(stringToSign)));

        return $"{stringToSign}.{signature}";
    }

    public static (bool Valid, string? UserId, string? Email, string? Role) ValidateJwtToken(string token)
    {
        try
        {
            var parts = token.Split('.');
            if (parts.Length != 3) return (false, null, null, null);

            var stringToSign = $"{parts[0]}.{parts[1]}";
            using var hmac = new HMACSHA256(SecretKey);
            var expectedSig = Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes(stringToSign)));
            if (expectedSig != parts[2]) return (false, null, null, null);

            var json = Encoding.UTF8.GetString(Base64UrlDecode(parts[1]));
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var exp = root.GetProperty("exp").GetInt64();
            if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > exp) return (false, null, null, null);

            var userId = root.TryGetProperty("sub", out var subProp) ? subProp.GetString() : null;
            var email = root.TryGetProperty("email", out var emailProp) ? emailProp.GetString() : null;
            var role = root.TryGetProperty("role", out var roleProp) ? roleProp.GetString() : null;
            return (true, userId, email, role);
        }
        catch
        {
            return (false, null, null, null);
        }
    }

    private static string Base64UrlEncode(byte[] input)
    {
        return Convert.ToBase64String(input).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    private static byte[] Base64UrlDecode(string input)
    {
        string output = input.Replace('-', '+').Replace('_', '/');
        switch (output.Length % 4)
        {
            case 2: output += "=="; break;
            case 3: output += "="; break;
        }
        return Convert.FromBase64String(output);
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
