namespace HospitalQueue.Models;

using System.ComponentModel.DataAnnotations;

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

public class IssueTicketRequest
{
    [Required]
    public string DepartmentId { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public UrgencyLevel Urgency { get; set; } = UrgencyLevel.Routine;
    public bool HasAppointment { get; set; }
}

public class CallNextRequest
{
    [Required]
    public string DepartmentId { get; set; } = string.Empty;
    public string RoomNumber { get; set; } = string.Empty;
    public string DoctorName { get; set; } = string.Empty;
}

public class UpdateStatusRequest
{
    [Required]
    public string TicketId { get; set; } = string.Empty;
    [Required]
    public TicketStatus NewStatus { get; set; }
}

public class QueueSnapshotDto
{
    public string DepartmentId { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
    public List<Ticket> WaitingQueue { get; set; } = new();
    public List<Ticket> CurrentlyCalled { get; set; } = new();
    public int EstimatedWaitMinutes { get; set; }
}
