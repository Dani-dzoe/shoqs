namespace HospitalQueue.Db;

using HospitalQueue.Models;
using HospitalQueue.Utils;

public static class DbSeeder
{
    public static void SeedDatabase(HospitalDbContext db)
    {
        if (db.Departments.Any()) return;

        var departments = new List<Department>
        {
            new Department { Id = "cardiology", Name = "Cardiology Clinic", Prefix = "CARD", Description = "Heart & Vascular Care", LastSequenceNumber = 104 },
            new Department { Id = "pediatrics", Name = "Pediatrics Wing", Prefix = "PEDS", Description = "Child & Adolescent Health", LastSequenceNumber = 202 },
            new Department { Id = "opd", Name = "Outpatient Department (OPD)", Prefix = "OPD", Description = "General Medicine & Checkups", LastSequenceNumber = 305 },
            new Department { Id = "emergency", Name = "Emergency Department (ER)", Prefix = "EMER", Description = "Trauma & Critical Care", LastSequenceNumber = 901 }
        };

        db.Departments.AddRange(departments);

        var doctorHash = AuthUtils.HashPassword("Doctor123!", out string doctorSalt);
        var adminHash = AuthUtils.HashPassword("Admin123!", out string adminSalt);

        var users = new List<UserAccount>
        {
            new UserAccount
            {
                Id = "usr-jenkins",
                Email = "dr.jenkins@stjude-hospital.org",
                FullName = "Dr. Sarah Jenkins, MD",
                AvatarUrl = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
                Role = "Doctor",
                DepartmentId = "cardiology",
                PasswordHash = doctorHash,
                PasswordSalt = doctorSalt
            },
            new UserAccount
            {
                Id = "usr-chen",
                Email = "dr.chen@stjude-hospital.org",
                FullName = "Dr. Michael Chen, MD",
                AvatarUrl = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
                Role = "Doctor",
                DepartmentId = "emergency",
                PasswordHash = doctorHash,
                PasswordSalt = doctorSalt
            },
            new UserAccount
            {
                Id = "usr-admin",
                Email = "admin.security@stjude-hospital.org",
                FullName = "Elena Rostova",
                AvatarUrl = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
                Role = "Admin",
                PasswordHash = adminHash,
                PasswordSalt = adminSalt
            }
        };

        db.Users.AddRange(users);

        var baseTime = DateTime.UtcNow;
        var sampleTickets = new List<Ticket>
        {
            new Ticket
            {
                Id = Guid.NewGuid().ToString(),
                DepartmentId = "emergency",
                TicketCode = "EMER-901",
                PatientName = "David Vance (Acute Chest Pain)",
                Urgency = UrgencyLevel.Emergency,
                HasAppointment = false,
                Status = TicketStatus.Waiting,
                CreatedAt = baseTime.AddMinutes(-12),
                EstimatedWaitMinutes = 0
            },
            new Ticket
            {
                Id = Guid.NewGuid().ToString(),
                DepartmentId = "cardiology",
                TicketCode = "CARD-101",
                PatientName = "Eleanor Rigby",
                Urgency = UrgencyLevel.Urgent,
                HasAppointment = true,
                Status = TicketStatus.Waiting,
                CreatedAt = baseTime.AddMinutes(-25),
                EstimatedWaitMinutes = 8
            },
            new Ticket
            {
                Id = Guid.NewGuid().ToString(),
                DepartmentId = "cardiology",
                TicketCode = "CARD-102",
                PatientName = "Arthur Pendelton",
                Urgency = UrgencyLevel.Routine,
                HasAppointment = false,
                Status = TicketStatus.Waiting,
                CreatedAt = baseTime.AddMinutes(-45),
                EstimatedWaitMinutes = 16
            },
            new Ticket
            {
                Id = Guid.NewGuid().ToString(),
                DepartmentId = "cardiology",
                TicketCode = "CARD-100",
                PatientName = "James Wilson",
                Urgency = UrgencyLevel.Priority,
                HasAppointment = true,
                Status = TicketStatus.Called,
                CreatedAt = baseTime.AddMinutes(-30),
                CalledAt = baseTime.AddMinutes(-2),
                RoomNumber = "Room 302 - Heart Center",
                DoctorName = "Dr. Sarah Jenkins"
            }
        };

        foreach (var t in sampleTickets)
        {
            t.RecalculatePriority(baseTime);
        }

        db.Tickets.AddRange(sampleTickets);
        db.SaveChanges();
    }

    public static void ResetDatabase(HospitalDbContext db)
    {
        var existingTickets = db.Tickets.ToList();
        db.Tickets.RemoveRange(existingTickets);
        db.SaveChanges();

        // Reset sequence numbers on departments
        var depts = db.Departments.ToList();
        foreach (var d in depts)
        {
            if (d.Id == "cardiology") d.LastSequenceNumber = 104;
            else if (d.Id == "pediatrics") d.LastSequenceNumber = 202;
            else if (d.Id == "opd") d.LastSequenceNumber = 305;
            else if (d.Id == "emergency") d.LastSequenceNumber = 901;
        }

        var baseTime = DateTime.UtcNow;
        var freshTickets = new List<Ticket>
        {
            new Ticket
            {
                Id = "t-seed-1",
                DepartmentId = "emergency",
                TicketCode = "EMER-901",
                PatientName = "David Vance (Acute Chest Pain)",
                Urgency = UrgencyLevel.Emergency,
                HasAppointment = false,
                Status = TicketStatus.Waiting,
                CreatedAt = baseTime.AddMinutes(-12),
                EstimatedWaitMinutes = 0
            },
            new Ticket
            {
                Id = "t-seed-2",
                DepartmentId = "cardiology",
                TicketCode = "CARD-101",
                PatientName = "Eleanor Rigby",
                Urgency = UrgencyLevel.Urgent,
                HasAppointment = true,
                Status = TicketStatus.Waiting,
                CreatedAt = baseTime.AddMinutes(-25),
                EstimatedWaitMinutes = 8,
                LinkedUserId = "usr-patient-rigby"
            },
            new Ticket
            {
                Id = "t-seed-3",
                DepartmentId = "cardiology",
                TicketCode = "CARD-102",
                PatientName = "Arthur Pendelton",
                Urgency = UrgencyLevel.Routine,
                HasAppointment = false,
                Status = TicketStatus.Waiting,
                CreatedAt = baseTime.AddMinutes(-45),
                EstimatedWaitMinutes = 16
            },
            new Ticket
            {
                Id = "t-seed-4",
                DepartmentId = "cardiology",
                TicketCode = "CARD-103",
                PatientName = "Sophia Martinez",
                Urgency = UrgencyLevel.Priority,
                HasAppointment = true,
                Status = TicketStatus.Waiting,
                CreatedAt = baseTime.AddMinutes(-10),
                EstimatedWaitMinutes = 24
            },
            new Ticket
            {
                Id = "t-seed-5",
                DepartmentId = "pediatrics",
                TicketCode = "PEDS-201",
                PatientName = "Leo Walker (Fever 103F)",
                Urgency = UrgencyLevel.Urgent,
                HasAppointment = false,
                Status = TicketStatus.Waiting,
                CreatedAt = baseTime.AddMinutes(-18),
                EstimatedWaitMinutes = 12
            },
            new Ticket
            {
                Id = "t-seed-6",
                DepartmentId = "cardiology",
                TicketCode = "CARD-100",
                PatientName = "James Henderson",
                Urgency = UrgencyLevel.Priority,
                HasAppointment = true,
                Status = TicketStatus.Called,
                CreatedAt = baseTime.AddMinutes(-30),
                CalledAt = baseTime.AddMinutes(-2),
                RoomNumber = "Room 302 - Heart Center",
                DoctorName = "Dr. Sarah Jenkins"
            }
        };

        foreach (var t in freshTickets)
        {
            t.RecalculatePriority(baseTime);
        }

        db.Tickets.AddRange(freshTickets);
        db.SaveChanges();
    }
}
