namespace HospitalQueue.Controllers;

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using HospitalQueue.Db;
using HospitalQueue.Hubs;
using HospitalQueue.Models;

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

    /// <summary>
    /// GET /api/queue/snapshot/{departmentId}
    /// Dynamic waiting list and called tickets with recalculated priorities.
    /// </summary>
    [HttpGet("snapshot/{departmentId}")]
    public async Task<IActionResult> GetSnapshot(string departmentId)
    {
        var now = DateTime.UtcNow;
        var department = await _db.Departments.FindAsync(departmentId);
        if (department == null)
        {
            return NotFound(new { message = "Department not found" });
        }

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

    /// <summary>
    /// POST /api/queue/issue
    /// Creates ticket, saves to DB, calculates score, broadcasts update via SignalR.
    /// </summary>
    [HttpPost("issue")]
    public async Task<IActionResult> IssueTicket([FromBody] IssueTicketRequest request)
    {
        var department = await _db.Departments.FindAsync(request.DepartmentId);
        if (department == null)
        {
            return BadRequest(new { message = "Invalid Department ID" });
        }

        department.LastSequenceNumber++;
        var ticketCode = $"{department.Prefix}-{department.LastSequenceNumber:D3}";

        var now = DateTime.UtcNow;
        var ticket = new Ticket
        {
            Id = Guid.NewGuid().ToString(),
            DepartmentId = request.DepartmentId,
            TicketCode = ticketCode,
            PatientName = string.IsNullOrWhiteSpace(request.PatientName) ? "Anonymous Patient" : request.PatientName.Trim(),
            Urgency = request.Urgency,
            HasAppointment = request.HasAppointment,
            Status = TicketStatus.Waiting,
            CreatedAt = now,
            EstimatedWaitMinutes = request.Urgency == UrgencyLevel.Emergency ? 0 : 15,
            LinkedUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        };

        ticket.RecalculatePriority(now);

        _db.Tickets.Add(ticket);
        await _db.SaveChangesAsync();

        var position = await _db.Tickets
            .Where(t => t.DepartmentId == request.DepartmentId && t.Status == TicketStatus.Waiting && t.PriorityScore > ticket.PriorityScore)
            .CountAsync() + 1;

        ticket.EstimatedWaitMinutes = ticket.Urgency == UrgencyLevel.Emergency ? 0 : position * 12;

        await _hubContext.Clients.Group(request.DepartmentId).SendAsync("QueueUpdated", new
        {
            EventType = "TICKET_ISSUED",
            Ticket = ticket,
            Position = position
        });
        await _hubContext.Clients.Group("LobbyGroup").SendAsync("QueueUpdated", new
        {
            EventType = "TICKET_ISSUED",
            DepartmentId = request.DepartmentId
        });

        return Created($"/api/queue/ticket/{ticket.Id}", new
        {
            Ticket = ticket,
            QueuePosition = position,
            Message = "Ticket issued successfully."
        });
    }

    /// <summary>
    /// POST /api/queue/call-next
    /// Dequeues highest priority ticket (Doctor or Admin role required).
    /// </summary>
    [HttpPost("call-next")]
    [Authorize(Policy = "DoctorOnly")]
    public async Task<IActionResult> CallNext([FromBody] CallNextRequest request)
    {
        var now = DateTime.UtcNow;

        var waitingTickets = await _db.Tickets
            .Where(t => t.DepartmentId == request.DepartmentId && t.Status == TicketStatus.Waiting)
            .ToListAsync();

        if (!waitingTickets.Any())
        {
            return NotFound(new { message = "No waiting patients in this department's queue." });
        }

        foreach (var t in waitingTickets)
        {
            t.RecalculatePriority(now);
        }

        var nextTicket = waitingTickets
            .OrderByDescending(t => t.PriorityScore)
            .ThenBy(t => t.CreatedAt)
            .First();

        var callingDoctor = User.FindFirst(ClaimTypes.Name)?.Value ?? request.DoctorName;

        nextTicket.Status = TicketStatus.Called;
        nextTicket.CalledAt = now;
        nextTicket.RoomNumber = string.IsNullOrWhiteSpace(request.RoomNumber) ? "Consultation Room" : request.RoomNumber;
        nextTicket.DoctorName = callingDoctor;

        await _db.SaveChangesAsync();

        var broadcastPayload = new
        {
            EventType = "PATIENT_CALLED",
            TicketId = nextTicket.Id,
            TicketCode = nextTicket.TicketCode,
            PatientName = nextTicket.PatientName,
            DepartmentId = nextTicket.DepartmentId,
            RoomNumber = nextTicket.RoomNumber,
            DoctorName = nextTicket.DoctorName,
            CalledAt = nextTicket.CalledAt
        };

        await _hubContext.Clients.Group(request.DepartmentId).SendAsync("PatientCalled", broadcastPayload);
        await _hubContext.Clients.Group("LobbyGroup").SendAsync("PatientCalled", broadcastPayload);
        await _hubContext.Clients.All.SendAsync("QueueUpdated", new { EventType = "PATIENT_CALLED", DepartmentId = request.DepartmentId });

        return Ok(new
        {
            Message = $"Patient {nextTicket.TicketCode} has been called to {nextTicket.RoomNumber}",
            Ticket = nextTicket
        });
    }

    /// <summary>
    /// POST /api/queue/update-status
    /// Updates ticket status (Doctor or Admin role required).
    /// </summary>
    [HttpPost("update-status")]
    [Authorize(Policy = "DoctorOnly")]
    public async Task<IActionResult> UpdateStatus([FromBody] UpdateStatusRequest request)
    {
        var ticket = await _db.Tickets.FindAsync(request.TicketId);
        if (ticket == null)
        {
            return NotFound(new { message = "Ticket not found." });
        }

        var now = DateTime.UtcNow;
        ticket.Status = request.NewStatus;

        if (request.NewStatus == TicketStatus.InConsultation)
        {
            ticket.ConsultationStartedAt = now;
        }
        else if (request.NewStatus == TicketStatus.Completed || request.NewStatus == TicketStatus.NoShow)
        {
            ticket.CompletedAt = now;
        }

        await _db.SaveChangesAsync();

        var updatePayload = new
        {
            EventType = "STATUS_CHANGED",
            TicketId = ticket.Id,
            TicketCode = ticket.TicketCode,
            DepartmentId = ticket.DepartmentId,
            Status = ticket.Status.ToString(),
            UpdatedAt = now
        };

        await _hubContext.Clients.Group(ticket.DepartmentId).SendAsync("QueueUpdated", updatePayload);
        await _hubContext.Clients.Group("LobbyGroup").SendAsync("QueueUpdated", updatePayload);

        return Ok(new
        {
            Message = $"Ticket {ticket.TicketCode} status updated to {ticket.Status}",
            Ticket = ticket
        });
    }
}
