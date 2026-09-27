namespace HospitalQueue.Controllers;

using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using HospitalQueue.Db;
using HospitalQueue.Hubs;
using HospitalQueue.Models;
using HospitalQueue.Utils;

[ApiController]
public class DoctorController : ControllerBase
{
    private readonly HospitalDbContext _db;
    private readonly IHubContext<QueueHub> _hubContext;
    private readonly QueueEventsBroadcaster _broadcaster;

    public DoctorController(HospitalDbContext db, IHubContext<QueueHub> hubContext, QueueEventsBroadcaster broadcaster)
    {
        _db = db;
        _hubContext = hubContext;
        _broadcaster = broadcaster;
    }

    /// <summary>
    /// POST /api/doctor/call-next
    /// Selects the highest priority waiting patient and calls them to the consultation room.
    /// </summary>
    [HttpPost("api/doctor/call-next")]
    public async Task<IActionResult> CallNext([FromBody] CallNextRequest request)
    {
        var now = DateTime.UtcNow;
        var deptId = string.IsNullOrWhiteSpace(request.DepartmentId) ? "cardiology" : request.DepartmentId;

        // Auto-complete or handle previous in-consultation ticket for this department/room if any
        var currentInConsult = await _db.Tickets
            .Where(t => t.DepartmentId == deptId && (t.Status == TicketStatus.Called || t.Status == TicketStatus.InConsultation))
            .ToListAsync();

        foreach (var inProg in currentInConsult)
        {
            inProg.Status = TicketStatus.Completed;
            inProg.CompletedAt = now;
        }

        var waiting = await _db.Tickets
            .Where(t => t.DepartmentId == deptId && t.Status == TicketStatus.Waiting)
            .ToListAsync();

        if (!waiting.Any())
        {
            await _db.SaveChangesAsync();
            return Ok(new
            {
                success = false,
                calledTicket = (Ticket?)null,
                message = "No waiting patients remaining in this department's queue."
            });
        }

        foreach (var t in waiting)
        {
            t.RecalculatePriority(now);
        }

        var nextTicket = waiting
            .OrderByDescending(t => t.PriorityScore)
            .ThenBy(t => t.CreatedAt)
            .First();

        var callingDoctor = !string.IsNullOrWhiteSpace(request.DoctorName)
            ? request.DoctorName
            : (User.FindFirst(ClaimTypes.Name)?.Value ?? "Dr. Sarah Jenkins");

        var room = !string.IsNullOrWhiteSpace(request.RoomNumber) ? request.RoomNumber : "Room 302";

        nextTicket.Status = TicketStatus.Called;
        nextTicket.CalledAt = now;
        nextTicket.DoctorName = callingDoctor;
        nextTicket.RoomNumber = room;

        await _db.SaveChangesAsync();

        var evt = new QueueEventItem
        {
            Type = "PATIENT_CALLED",
            TicketCode = nextTicket.TicketCode,
            DepartmentId = nextTicket.DepartmentId,
            Message = $"Ticket {nextTicket.TicketCode} ({nextTicket.PatientName}) called to {nextTicket.RoomNumber} by {nextTicket.DoctorName}",
            Data = nextTicket
        };
        _broadcaster.Broadcast(evt);

        await _hubContext.Clients.Group(deptId).SendAsync("PatientCalled", evt);
        await _hubContext.Clients.Group("LobbyGroup").SendAsync("PatientCalled", evt);
        await _hubContext.Clients.All.SendAsync("QueueUpdated", evt);

        return Ok(new
        {
            success = true,
            calledTicket = nextTicket,
            message = $"Patient {nextTicket.TicketCode} has been called to {room}."
        });
    }

    /// <summary>
    /// POST /api/doctor/complete-consultation
    /// Marks consultation completed and patient discharged.
    /// </summary>
    [HttpPost("api/doctor/complete-consultation")]
    public async Task<IActionResult> CompleteConsultation([FromBody] CompleteConsultationRequest? request)
    {
        var now = DateTime.UtcNow;
        var deptId = request?.DepartmentId ?? "cardiology";
        var ticketId = request?.TicketId;

        Ticket? ticket = null;
        if (!string.IsNullOrEmpty(ticketId))
        {
            ticket = await _db.Tickets.FindAsync(ticketId);
        }

        if (ticket == null)
        {
            ticket = await _db.Tickets
                .Where(t => t.DepartmentId == deptId && (t.Status == TicketStatus.Called || t.Status == TicketStatus.InConsultation))
                .OrderByDescending(t => t.CalledAt)
                .FirstOrDefaultAsync();
        }

        if (ticket == null)
        {
            return BadRequest(new { success = false, message = "No active consultation found to complete." });
        }

        ticket.Status = TicketStatus.Completed;
        ticket.CompletedAt = now;
        await _db.SaveChangesAsync();

        var evt = new QueueEventItem
        {
            Type = "STATUS_CHANGED",
            TicketCode = ticket.TicketCode,
            DepartmentId = ticket.DepartmentId,
            Message = $"Ticket {ticket.TicketCode} completed consultation.",
            Data = ticket
        };
        _broadcaster.Broadcast(evt);

        await _hubContext.Clients.Group(ticket.DepartmentId).SendAsync("QueueUpdated", evt);
        await _hubContext.Clients.Group("LobbyGroup").SendAsync("QueueUpdated", evt);

        return Ok(new
        {
            success = true,
            ticket,
            message = $"Consultation for {ticket.TicketCode} completed."
        });
    }

    /// <summary>
    /// POST /api/doctor/recall
    /// Re-announces the currently called patient.
    /// </summary>
    [HttpPost("api/doctor/recall")]
    public async Task<IActionResult> Recall([FromBody] RecallRequest? request)
    {
        var deptId = request?.DepartmentId ?? "cardiology";

        var ticket = await _db.Tickets
            .Where(t => t.DepartmentId == deptId && (t.Status == TicketStatus.Called || t.Status == TicketStatus.InConsultation))
            .OrderByDescending(t => t.CalledAt)
            .FirstOrDefaultAsync();

        if (ticket == null)
        {
            return BadRequest(new { success = false, message = "No called ticket found to recall." });
        }

        var evt = new QueueEventItem
        {
            Type = "PATIENT_CALLED",
            TicketCode = ticket.TicketCode,
            DepartmentId = ticket.DepartmentId,
            Message = $"[RECALL] Patient {ticket.TicketCode} ({ticket.PatientName}), please proceed to {ticket.RoomNumber}",
            Data = ticket
        };
        _broadcaster.Broadcast(evt);

        await _hubContext.Clients.Group(ticket.DepartmentId).SendAsync("PatientCalled", evt);
        await _hubContext.Clients.Group("LobbyGroup").SendAsync("PatientCalled", evt);

        return Ok(new
        {
            success = true,
            ticket,
            message = $"Patient {ticket.TicketCode} recalled to {ticket.RoomNumber}."
        });
    }

    /// <summary>
    /// POST /api/queue/update-status
    /// </summary>
    [HttpPost("api/queue/update-status")]
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

        var evt = new QueueEventItem
        {
            Type = "STATUS_CHANGED",
            TicketCode = ticket.TicketCode,
            DepartmentId = ticket.DepartmentId,
            Message = $"Ticket {ticket.TicketCode} status changed to {ticket.Status}",
            Data = ticket
        };
        _broadcaster.Broadcast(evt);

        await _hubContext.Clients.Group(ticket.DepartmentId).SendAsync("QueueUpdated", evt);
        await _hubContext.Clients.Group("LobbyGroup").SendAsync("QueueUpdated", evt);

        return Ok(new
        {
            success = true,
            ticket,
            message = $"Ticket {ticket.TicketCode} updated to {ticket.Status}"
        });
    }
}
