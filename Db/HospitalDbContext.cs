namespace HospitalQueue.Db;

using Microsoft.EntityFrameworkCore;
using HospitalQueue.Models;

public class HospitalDbContext : DbContext
{
    public HospitalDbContext(DbContextOptions<HospitalDbContext> options) : base(options) { }

    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<UserAccount> Users => Set<UserAccount>();
}
