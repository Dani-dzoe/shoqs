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

    [HttpGet]
    public async Task<IActionResult> GetDepartments()
    {
        var list = await _db.Departments.AsNoTracking().ToListAsync();
        return Ok(new
        {
            departments = list
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDepartmentById(string id)
    {
        var dept = await _db.Departments.FindAsync(id);
        if (dept == null) return NotFound(new { message = "Department not found" });
        return Ok(dept);
    }
}
