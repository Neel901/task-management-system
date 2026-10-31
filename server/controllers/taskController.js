const mongoose = require("mongoose");
const Task = require("../models/Task");
const User = require("../models/User");
const {
  generateTaskNumber,
  escapeRegex,
  cleanText,
  startOfToday,
} = require("../utils/helpers");

const POPULATE = [
  { path: "assignedTo", select: "name email employeeCode" },
  { path: "createdBy", select: "name email employeeCode" },
];
const CLOSED = ["done", "rejected"];
const isId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Validates task fields that are present in `body`.
 * Returns { error } or { data } with cleaned values.
 */
const validateFields = (body) => {
  const data = {};

  if ("title" in body) {
    if (typeof body.title !== "string") return { error: "Title must be text" };
    data.title = cleanText(body.title);
    if (data.title.length < 3) return { error: "Title is too short (min 3 characters)" };
    if (data.title.length > 200) return { error: "Title is too long (max 200 characters)" };
  }

  if ("description" in body) {
    if (body.description != null && typeof body.description !== "string") {
      return { error: "Description must be text" };
    }
    data.description = cleanText(body.description || "");
  }

  if ("status" in body) {
    if (!Task.STATUSES.includes(body.status)) return { error: "Invalid status" };
    data.status = body.status;
  }

  if ("priority" in body) {
    if (!Task.PRIORITIES.includes(body.priority)) return { error: "Invalid priority" };
    data.priority = body.priority;
  }

  if ("dueDate" in body) {
    if (!body.dueDate) {
      data.dueDate = null;
    } else {
      const due = new Date(body.dueDate);
      if (isNaN(due.getTime())) return { error: "Invalid due date" };
      if (due < startOfToday()) return { error: "Due date cannot be in the past" };
      data.dueDate = due;
    }
  }

  if ("assignedTo" in body) {
    if (!isId(body.assignedTo)) return { error: "Invalid assigned user" };
    data.assignedTo = body.assignedTo;
  }

  return { data };
};

// Stops two open tasks with the same title being assigned to the same person
const hasDuplicate = (title, assignedTo, excludeId) =>
  Task.exists({
    _id: { $ne: excludeId },
    title: new RegExp(`^${escapeRegex(title)}$`, "i"),
    assignedTo,
    isDeleted: false,
    status: { $nin: CLOSED },
  });

// Loads a task the current user is allowed to see, or sends an error response
const loadTask = async (req, res) => {
  if (!isId(req.params.id)) {
    res.status(400).json({ message: "Invalid task id" });
    return null;
  }
  const task = await Task.findOne({ _id: req.params.id, isDeleted: false });
  if (!task) {
    res.status(404).json({ message: "Task not found" });
    return null;
  }
  if (req.user.role === "employee" && task.assignedTo.toString() !== req.user.id) {
    res.status(403).json({ message: "You can only access tasks assigned to you" });
    return null;
  }
  return task;
};

// POST /api/tasks
const createTask = async (req, res) => {
  const body = { ...req.body };

  // Employees can only create tasks for themselves
  if (req.user.role === "employee") {
    if (body.assignedTo && body.assignedTo !== req.user.id) {
      return res.status(403).json({ message: "Employees can only assign tasks to themselves" });
    }
    body.assignedTo = req.user.id;
  }

  if (!body.title) return res.status(400).json({ message: "Title is required" });
  if (!body.assignedTo) return res.status(400).json({ message: "Assignee is required" });

  const { error, data } = validateFields(body);
  if (error) return res.status(400).json({ message: error });

  const assignee = await User.findById(data.assignedTo);
  if (!assignee) return res.status(404).json({ message: "Assigned user not found" });

  if (await hasDuplicate(data.title, data.assignedTo)) {
    return res
      .status(409)
      .json({ message: `A similar open task is already assigned to ${assignee.name}` });
  }

  const task = await Task.create({
    ...data,
    taskNumber: await generateTaskNumber(),
    createdBy: req.user.id,
    completedAt: data.status === "done" ? new Date() : null,
  });
  await task.populate(POPULATE);

  res.status(201).json({ message: "Task created", task });
};

// GET /api/tasks?page=1&limit=10&search=&status=&priority=&assignedTo=
const getTasks = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
  const { search, status, priority, assignedTo } = req.query;

  const filter = { isDeleted: false };

  if (req.user.role === "employee") {
    filter.assignedTo = req.user.id;
  } else if (assignedTo && isId(assignedTo)) {
    filter.assignedTo = assignedTo;
  }

  if (search) {
    const rx = { $regex: escapeRegex(search), $options: "i" };
    filter.$or = [{ title: rx }, { taskNumber: rx }];
  }

  // Special status filters: "active" and "overdue"
  if (status === "active") {
    filter.status = { $in: ["next", "in-progress"] };
  } else if (status === "overdue") {
    filter.dueDate = { $lt: startOfToday() };
    filter.status = { $nin: CLOSED };
  } else if (status) {
    filter.status = status;
  }

  if (priority) filter.priority = priority;

  const [total, tasks] = await Promise.all([
    Task.countDocuments(filter),
    Task.find(filter)
      .populate(POPULATE)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  res.json({
    tasks,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
  });
};

// GET /api/tasks/:id
const getTaskById = async (req, res) => {
  const task = await loadTask(req, res);
  if (!task) return;
  await task.populate(POPULATE);
  res.json({ task });
};

// PATCH /api/tasks/:id
const updateTask = async (req, res) => {
  const task = await loadTask(req, res);
  if (!task) return;

  // Which fields each kind of user may change
  let allowed = ["title", "description", "status", "priority", "dueDate", "assignedTo"];
  if (req.user.role === "employee") {
    const createdBySelf = task.createdBy.toString() === req.user.id;
    allowed = createdBySelf
      ? ["title", "description", "status", "priority", "dueDate"]
      : ["status"]; // tasks from a manager: employee only moves the status
  }

  const notAllowed = Object.keys(req.body).filter((f) => !allowed.includes(f));
  if (notAllowed.length) {
    return res.status(403).json({ message: `You cannot change: ${notAllowed.join(", ")}` });
  }

  // Unchanged due date (e.g. already past) should not fail validation
  const body = { ...req.body };
  if (
    "dueDate" in body &&
    body.dueDate &&
    task.dueDate &&
    new Date(body.dueDate).getTime() === task.dueDate.getTime()
  ) {
    delete body.dueDate;
  }

  const { error, data } = validateFields(body);
  if (error) return res.status(400).json({ message: error });

  if (data.assignedTo && !(await User.exists({ _id: data.assignedTo }))) {
    return res.status(404).json({ message: "Assigned user not found" });
  }

  const newTitle = data.title ?? task.title;
  const newAssignee = data.assignedTo ?? task.assignedTo;
  if (
    (data.title || data.assignedTo) &&
    (await hasDuplicate(newTitle, newAssignee, task._id))
  ) {
    return res.status(409).json({ message: "A similar open task already exists for this user" });
  }

  // Track when a task was completed
  if (data.status === "done" && task.status !== "done") data.completedAt = new Date();
  if (data.status && data.status !== "done") data.completedAt = null;

  task.set(data);
  if (!task.isModified()) {
    return res.json({ message: "No changes", task: await task.populate(POPULATE) });
  }

  await task.save();
  await task.populate(POPULATE);
  res.json({ message: "Task updated", task });
};

// DELETE /api/tasks/:id  (soft delete)
const deleteTask = async (req, res) => {
  const task = await loadTask(req, res);
  if (!task) return;

  if (req.user.role === "employee" && task.createdBy.toString() !== req.user.id) {
    return res.status(403).json({ message: "You can only delete tasks you created" });
  }

  task.isDeleted = true;
  task.deletedBy = req.user.id;
  task.deletedAt = new Date();
  await task.save();

  res.json({ message: "Task deleted" });
};

// GET /api/tasks/meta -> lists of statuses and priorities for dropdowns
const getMeta = (req, res) => {
  res.json({ statuses: Task.STATUSES, priorities: Task.PRIORITIES });
};

module.exports = { createTask, getTasks, getTaskById, updateTask, deleteTask, getMeta };
