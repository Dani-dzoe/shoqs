namespace HospitalQueue.Utils;

using HospitalQueue.Models;

public static class PriorityCalculator
{
    /// <summary>
    /// Calculates the dynamic priority score based on triage urgency, wait duration, and scheduled appointment status.
    /// PriorityScore = (UrgencyWeight * 20) + (WaitMinutes * 1.5) + (HasAppointment ? 15 : 0)
    /// Emergency cases jump directly to baseline 999999 + wait time.
    /// </summary>
    public static double CalculateScore(UrgencyLevel urgency, bool hasAppointment, DateTime createdAt, DateTime currentUtcNow)
    {
        var waitTimeInMinutes = Math.Max(0, (currentUtcNow - createdAt).TotalMinutes);

        if (urgency == UrgencyLevel.Emergency)
        {
            return 999999.0 + waitTimeInMinutes;
        }

        return (waitTimeInMinutes * 1.5) + ((int)urgency * 20.0) + (hasAppointment ? 15.0 : 0.0);
    }
}
