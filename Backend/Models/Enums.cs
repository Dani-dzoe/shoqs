namespace HospitalQueue.Models;

using System.Text.Json.Serialization;

public enum UrgencyLevel
{
    Routine = 1,
    Priority = 2,
    Urgent = 3,
    Emergency = 4
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TicketStatus
{
    Waiting,
    Called,
    InConsultation,
    Completed,
    NoShow
}
