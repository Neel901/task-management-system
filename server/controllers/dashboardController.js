const Task = require("../models/Task");
const { startOfToday } = require("../utils/helpers");

// Managers see everything, employees see only their own tasks
const baseFilter = (user) =>
  user.role === "manager"
    ? { isDeleted: false }
    : { isDeleted: false, assignedTo: user.id };

// GET /api/dashboard/stats
const getStats = async (req, res) => {
  const filter = baseFilter(req.user);
  const open = { $nin: ["done", "rejected"] };

  const [total, active, overdue, critical, completed] = await Promise.all([
    Task.countDocuments(filter),
    Task.countDocuments({ ...filter, status: { $in: ["next", "in-progress"] } }),
    Task.countDocuments({ ...filter, status: open, dueDate: { $lt: startOfToday() } }),
    Task.countDocuments({ ...filter, status: open, priority: "critical" }),
    Task.countDocuments({ ...filter, status: "done" }),
  ]);

  res.json({ stats: { total, active, overdue, critical, completed } });
};

// GET /api/dashboard/recent
const getRecentTasks = async (req, res) => {
  const tasks = await Task.find(baseFilter(req.user))
    .sort({ updatedAt: -1 })
    .limit(5)
    .populate("assignedTo", "name")
    .lean();

  res.json({ tasks });
};

module.exports = { getStats, getRecentTasks };
