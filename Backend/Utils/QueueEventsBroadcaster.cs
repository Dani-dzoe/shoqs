namespace HospitalQueue.Utils;

using System.Collections.Concurrent;
using System.Threading.Channels;

public class QueueEventItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string Type { get; set; } = string.Empty; // "TICKET_ISSUED", "PATIENT_CALLED", "STATUS_CHANGED", "RESET_ALL"
    public string TicketCode { get; set; } = string.Empty;
    public string DepartmentId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public object? Data { get; set; }
}

public class QueueEventsBroadcaster
{
    private readonly ConcurrentBag<QueueEventItem> _recentEvents = new();
    private readonly ConcurrentDictionary<string, Channel<QueueEventItem>> _subscribers = new();

    public void Broadcast(QueueEventItem evt)
    {
        _recentEvents.Add(evt);
        foreach (var sub in _subscribers.Values)
        {
            sub.Writer.TryWrite(evt);
        }
    }

    public List<QueueEventItem> GetRecentEvents(int limit = 30)
    {
        return _recentEvents.OrderByDescending(e => e.Timestamp).Take(limit).ToList();
    }

    public Channel<QueueEventItem> Subscribe(string clientId)
    {
        var channel = Channel.CreateUnbounded<QueueEventItem>();
        _subscribers[clientId] = channel;
        return channel;
    }

    public void Unsubscribe(string clientId)
    {
        _subscribers.TryRemove(clientId, out _);
    }
}
