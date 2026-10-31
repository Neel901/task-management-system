const User = require("../models/User");
const Task = require("../models/Task");

// GET /api/users/employees  (manager only) -> used for the "assign to" dropdown
const getEmployees = async (req, res) => {
  const employees = await User.find({ role: "employee" })
    .select("name email employeeCode")
    .sort({ name: 1 })
    .lean();

  res.json({ employees });
};

// GET /api/users/employees/stats  (manager only) -> open/done counts per employee
const getEmployeeStats = async (req, res) => {
  const employees = await User.find({ role: "employee" })
    .select("name email employeeCode")
    .sort({ name: 1 })
    .lean();

  const counts = await Task.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: "$assignedTo",
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
      },
    },
  ]);
  const byId = Object.fromEntries(counts.map((c) => [c._id.toString(), c]));

  res.json({
    employees: employees.map((e) => {
      const c = byId[e._id.toString()] || { total: 0, done: 0 };
      return { ...e, totalTasks: c.total, completedTasks: c.done };
    }),
  });
};

module.exports = { getEmployees, getEmployeeStats };
