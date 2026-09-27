namespace HospitalQueue.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HospitalQueue.Db;

[ApiController]
[Route("api/departments")]
public class DepartmentsController : ControllerBase
{
    private readonly HospitalDbContext _db;

    public DepartmentsController(HospitalDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// GET /api/departments
    /// Fetch all hospital departments.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetDepartments()
    {
        var departments = await _db.Departments.AsNoTracking().ToListAsync();
        return Ok(departments);
    }
}
