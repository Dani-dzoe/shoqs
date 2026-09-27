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
public class QueueController : ControllerBase
{
    private readonly HospitalDbContext _db;
    private readonly IHubContext<QueueHub> _hubContext;
    private readonly QueueEventsBroadcaster _broadcaster;

    public QueueController(HospitalDbContext db, IHubContext<QueueHub> hubContext, QueueEventsBroadcaster broadcaster)
    {
        _db = db;
        _hubContext = hubContext;
        _broadcaster = broadcaster;
    }

    /// <summary>
    /// GET /api/queue/overview
    /// Full multi-department snapshot for lobby monitors and admin overviews.
    /// </summary>
    [HttpGet("api/queue/overview")]
    public async Task<IActionResult> GetOverview()
    {
        var now = DateTime.UtcNow;
        var departments = await _db.Departments.AsNoTracking().ToListAsync();
        var allTickets = await _db.Tickets.ToListAsync();

        var deptOverviews = new List<object>();

        foreach (var dept in departments)
        {
            var deptTickets = allTickets.Where(t => t.DepartmentId == dept.Id).ToList();

            foreach (var t in deptTickets.Where(t => t.Status == TicketStatus.Waiting))
            {
                t.RecalculatePriority(now);
            }

            var waitingQueue = deptTickets
                .Where(t => t.Status == TicketStatus.Waiting)
                .OrderByDescending(t => t.PriorityScore)
                .ThenBy(t => t.CreatedAt)
                .ToList();

            var inConsultation = deptTickets
                .FirstOrDefault(t => t.Status == TicketStatus.Called || t.Status == TicketStatus.InConsultation);

            var completedTickets = deptTickets
                .Where(t => t.Status == TicketStatus.Completed || t.Status == TicketStatus.NoShow)
                .OrderByDescending(t => t.CompletedAt ?? t.CreatedAt)
                .Take(10)
                .ToList();

            deptOverviews.Add(new
            {
                department = dept,
                waitingQueue,
                inConsultation,
                completedTickets,
                waitingCount = waitingQueue.Count,
                estimatedWaitMinutes = waitingQueue.Count * 12
            });
        }

        return Ok(new
        {
            timestamp = now.ToString("o"),
            departments = deptOverviews,
            recentEvents = _broadcaster.GetRecentEvents(15)
        });
    }

    /// <summary>
    /// GET /api/queue/{departmentId}
    /// Specific department queue details.
    /// </summary>
    [HttpGet("api/queue/{departmentId}")]
    public async Task<IActionResult> GetDepartmentQueue(string departmentId)
    {
        var now = DateTime.UtcNow;
        var dept = await _db.Departments.FindAsync(departmentId);
        if (dept == null)
        {
            return NotFound(new { message = "Department not found." });
        }

        var deptTickets = await _db.Tickets
            .Where(t => t.DepartmentId == departmentId)
            .ToListAsync();

        foreach (var t in deptTickets.Where(t => t.Status == TicketStatus.Waiting))
        {
            t.RecalculatePriority(now);
        }

        var waitingQueue = deptTickets
            .Where(t => t.Status == TicketStatus.Waiting)
            .OrderByDescending(t => t.PriorityScore)
            .ThenBy(t => t.CreatedAt)
            .ToList();

        var inConsultation = deptTickets
            .FirstOrDefault(t => t.Status == TicketStatus.Called || t.Status == TicketStatus.InConsultation);

        var completedTickets = deptTickets
            .Where(t => t.Status == TicketStatus.Completed || t.Status == TicketStatus.NoShow)
            .OrderByDescending(t => t.CompletedAt ?? t.CreatedAt)
            .Take(10)
            .ToList();

        return Ok(new
        {
            department = dept,
            waitingQueue,
            inConsultation,
            completedTickets,
            waitingCount = waitingQueue.Count,
            estimatedWaitMinutes = waitingQueue.Count * 12
        });
    }

    /// <summary>
    /// GET /api/queue/patient/{userId}
    /// Looks up active queue ticket for a patient user.
    /// </summary>
    [HttpGet("api/queue/patient/{userId}")]
    public async Task<IActionResult> GetPatientStatus(string userId, [FromQuery] string? email)
    {
        var now = DateTime.UtcNow;
        var cleanId = userId.Trim();

        var activeTicket = await _db.Tickets
            .Where(t => (t.LinkedUserId == cleanId || (!string.IsNullOrEmpty(email) && t.PatientName.ToLower().Contains(email.ToLower())))
                        && (t.Status == TicketStatus.Waiting || t.Status == TicketStatus.Called || t.Status == TicketStatus.InConsultation))
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync();

        if (activeTicket == null)
        {
            return Ok(new
            {
                activeTicket = (object?)null,
                position = 0,
                estimatedWaitMinutes = 0,
                inConsultation = false,
                department = (object?)null,
                message = "No active ticket found for this patient."
            });
        }

        var dept = await _db.Departments.FindAsync(activeTicket.DepartmentId);
        int position = 0;
        if (activeTicket.Status == TicketStatus.Waiting)
        {
            activeTicket.RecalculatePriority(now);
            var waiting = await _db.Tickets
                .Where(t => t.DepartmentId == activeTicket.DepartmentId && t.Status == TicketStatus.Waiting)
                .ToListAsync();

            foreach (var w in waiting) w.RecalculatePriority(now);

            position = waiting.OrderByDescending(w => w.PriorityScore).ThenBy(w => w.CreatedAt).ToList().FindIndex(w => w.Id == activeTicket.Id) + 1;
        }

        return Ok(new
        {
            activeTicket,
            position,
            estimatedWaitMinutes = activeTicket.Urgency == UrgencyLevel.Emergency ? 0 : Math.Max(0, position * 12),
            inConsultation = activeTicket.Status == TicketStatus.Called || activeTicket.Status == TicketStatus.InConsultation,
            department = dept
        });
    }

    /// <summary>
    /// POST /api/tickets
    /// POST /api/queue/issue
    /// Creates and issues a new digital patient ticket.
    /// </summary>
    [HttpPost("api/tickets")]
    [HttpPost("api/queue/issue")]
    public async Task<IActionResult> IssueTicket([FromBody] IssueTicketRequest request)
    {
        var dept = await _db.Departments.FindAsync(request.DepartmentId);
        if (dept == null)
        {
            return BadRequest(new { message = "Invalid Department ID" });
        }

        dept.LastSequenceNumber++;
        var ticketCode = $"{dept.Prefix}-{dept.LastSequenceNumber:D3}";
        var now = DateTime.UtcNow;

        var ticket = new Ticket
        {
            Id = $"t-{Guid.NewGuid():N}"[..12],
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

        var waitingList = await _db.Tickets
            .Where(t => t.DepartmentId == request.DepartmentId && t.Status == TicketStatus.Waiting)
            .ToListAsync();
        foreach (var t in waitingList) t.RecalculatePriority(now);

        var position = waitingList
            .OrderByDescending(t => t.PriorityScore)
            .ThenBy(t => t.CreatedAt)
            .ToList()
            .FindIndex(t => t.Id == ticket.Id) + 1;

        ticket.EstimatedWaitMinutes = ticket.Urgency == UrgencyLevel.Emergency ? 0 : position * 12;

        var evt = new QueueEventItem
        {
            Type = "TICKET_ISSUED",
            TicketCode = ticket.TicketCode,
            DepartmentId = ticket.DepartmentId,
            Message = $"Ticket {ticket.TicketCode} issued for {ticket.PatientName} ({ticket.Urgency})",
            Data = new { ticket, position }
        };
        _broadcaster.Broadcast(evt);

        await _hubContext.Clients.Group(request.DepartmentId).SendAsync("QueueUpdated", evt);
        await _hubContext.Clients.Group("LobbyGroup").SendAsync("QueueUpdated", evt);

        return Created($"/api/tickets/{ticket.TicketCode}", new
        {
            ticket,
            department = dept,
            queuePosition = position,
            estimatedWaitMinutes = ticket.EstimatedWaitMinutes
        });
    }

    /// <summary>
    /// GET /api/tickets/{code}
    /// Lookup ticket by code or id.
    /// </summary>
    [HttpGet("api/tickets/{code}")]
    public async Task<IActionResult> GetTicket(string code)
    {
        var clean = code.Trim().ToUpper();
        var ticket = await _db.Tickets.FirstOrDefaultAsync(t => t.TicketCode.ToUpper() == clean || t.Id == code);
        if (ticket == null)
        {
            return NotFound(new { message = "Ticket not found." });
        }

        var dept = await _db.Departments.FindAsync(ticket.DepartmentId);
        int position = 0;
        if (ticket.Status == TicketStatus.Waiting)
        {
            var now = DateTime.UtcNow;
            ticket.RecalculatePriority(now);
            var waiting = await _db.Tickets
                .Where(t => t.DepartmentId == ticket.DepartmentId && t.Status == TicketStatus.Waiting)
                .ToListAsync();
            foreach (var w in waiting) w.RecalculatePriority(now);

            position = waiting.OrderByDescending(w => w.PriorityScore).ThenBy(w => w.CreatedAt).ToList().FindIndex(w => w.Id == ticket.Id) + 1;
        }

        return Ok(new
        {
            ticket,
            department = dept,
            queuePosition = position,
            inConsultation = ticket.Status == TicketStatus.Called || ticket.Status == TicketStatus.InConsultation
        });
    }
}
