namespace HospitalQueue.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using HospitalQueue.Utils;

[ApiController]
[Route("api/events")]
public class EventsController : ControllerBase
{
    private readonly QueueEventsBroadcaster _broadcaster;

    public EventsController(QueueEventsBroadcaster broadcaster)
    {
        _broadcaster = broadcaster;
    }

    [HttpGet("stream")]
    public async Task GetStream(CancellationToken cancellationToken)
    {
        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");

        var clientId = Guid.NewGuid().ToString();
        var channel = _broadcaster.Subscribe(clientId);

        try
        {
            await Response.WriteAsync($"data: {JsonSerializer.Serialize(new { type = "CONNECTED", message = "Connected to C# ASP.NET Core Event Stream" })}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);

            while (!cancellationToken.IsCancellationRequested)
            {
                var evt = await channel.Reader.ReadAsync(cancellationToken);
                var json = JsonSerializer.Serialize(new
                {
                    id = evt.Id,
                    type = evt.Type,
                    ticketCode = evt.TicketCode,
                    departmentId = evt.DepartmentId,
                    message = evt.Message,
                    timestamp = evt.Timestamp.ToString("o"),
                    data = evt.Data
                });

                await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Client disconnected
        }
        finally
        {
            _broadcaster.Unsubscribe(clientId);
        }
    }
}
