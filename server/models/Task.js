const mongoose = require("mongoose");

const STATUSES = [
  "next",
  "in-progress",
  "on-hold",
  "review",
  "done",
  "backlog",
  "rejected",
];
const PRIORITIES = ["blocker", "critical", "major", "medium", "minor", "unassigned"];

const taskSchema = new mongoose.Schema(
  {
    taskNumber: { type: String, unique: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
    description: { type: String, trim: true, default: "" },
    status: { type: String, enum: STATUSES, default: "next", index: true },
    priority: { type: String, enum: PRIORITIES, default: "unassigned" },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dueDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },

    // Soft delete: tasks are hidden, not removed
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const Task = mongoose.model("Task", taskSchema);

// Handy for validation and for sending dropdown options to the frontend
Task.STATUSES = STATUSES;
Task.PRIORITIES = PRIORITIES;

module.exports = Task;
