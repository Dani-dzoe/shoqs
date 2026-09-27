namespace HospitalQueue.Hubs;

using Microsoft.AspNetCore.SignalR;

public class QueueHub : Hub
{
    public async Task JoinDepartmentGroup(string departmentId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, departmentId);
    }

    public async Task LeaveDepartmentGroup(string departmentId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, departmentId);
    }

    public async Task JoinLobbyGroup()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "LobbyGroup");
    }
}
