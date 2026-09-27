namespace HospitalQueue.Models;

using System.ComponentModel.DataAnnotations;

public class UserAccount
{
    [Key]
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public string Role { get; set; } = "Patient"; // Doctor, Nurse, Admin, Patient
    public string? DepartmentId { get; set; }
    public string? GoogleSub { get; set; }
    public string? PasswordHash { get; set; }
    public string? PasswordSalt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastLoginAt { get; set; } = DateTime.UtcNow;
}
