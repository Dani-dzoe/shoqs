namespace HospitalQueue.Models;

using System.ComponentModel.DataAnnotations;
using HospitalQueue.Utils;

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
    public DateTime? ConsultationStartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public string? RoomNumber { get; set; }
    public string? DoctorName { get; set; }
    public int EstimatedWaitMinutes { get; set; }
    public string? LinkedUserId { get; set; }

    public double PriorityScore { get; set; }
    public double WaitTimeMinutes => Math.Max(0, (DateTime.UtcNow - CreatedAt).TotalMinutes);

    public void RecalculatePriority(DateTime currentUtcNow)
    {
        PriorityScore = PriorityCalculator.CalculateScore(Urgency, HasAppointment, CreatedAt, currentUtcNow);
    }
}
