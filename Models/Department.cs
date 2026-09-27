namespace HospitalQueue.Models;

using System.ComponentModel.DataAnnotations;

public class Department
{
    [Key]
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Prefix { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int LastSequenceNumber { get; set; } = 100;
}
