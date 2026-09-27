namespace HospitalQueue.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using HospitalQueue.Db;
using HospitalQueue.Hubs;
using HospitalQueue.Utils;

[ApiController]
[Route("api/simulation")]
public class SimulationController : ControllerBase
{
    private readonly HospitalDbContext _db;
    private readonly IHubContext<QueueHub> _hubContext;
    private readonly QueueEventsBroadcaster _broadcaster;

    public SimulationController(HospitalDbContext db, IHubContext<QueueHub> hubContext, QueueEventsBroadcaster broadcaster)
    {
        _db = db;
        _hubContext = hubContext;
        _broadcaster = broadcaster;
    }

    [HttpPost("reset")]
    public async Task<IActionResult> Reset()
    {
        // Remove existing tickets
        var tickets = await _db.Tickets.ToListAsync();
        _db.Tickets.RemoveRange(tickets);
        await _db.SaveChangesAsync();

        // Seed fresh tickets & departments
        DbSeeder.ResetDatabase(_db);

        var evt = new QueueEventItem
        {
            Type = "RESET_ALL",
            Message = "Hospital Queue Simulation reset to initial seed state."
        };
        _broadcaster.Broadcast(evt);

        await _hubContext.Clients.All.SendAsync("QueueUpdated", evt);

        return Ok(new
        {
            success = true,
            message = "Simulation reset to initial seeded state."
        });
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var ticketCount = await _db.Tickets.CountAsync();
        var userCount = await _db.Users.CountAsync();
        var deptCount = await _db.Departments.CountAsync();

        return Ok(new
        {
            active = true,
            backend = "C# ASP.NET Core 8",
            ticketCount,
            userCount,
            deptCount,
            timestamp = DateTime.UtcNow.ToString("o")
        });
    }
}
