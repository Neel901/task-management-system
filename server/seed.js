// Run with: npm run seed
// Wipes users, tasks and counters, then creates 1 manager, 2 employees and a few tasks.
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Task = require("./models/Task");
const Counter = require("./models/Counter");

const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  await Promise.all([User.deleteMany({}), Task.deleteMany({}), Counter.deleteMany({})]);

  // User.create runs the password-hashing hook for each user
  const [manager, asha, ravi] = await User.create([
    { employeeCode: "MGR-001", name: "Meera Manager", email: "manager@example.com", password: "password123", role: "manager" },
    { employeeCode: "EMP-001", name: "Asha Sharma", email: "asha@example.com", password: "password123", role: "employee" },
    { employeeCode: "EMP-002", name: "Ravi Kumar", email: "ravi@example.com", password: "password123", role: "employee" },
  ]);
  await Counter.create([
    { _id: "employee", seq: 2 },
    { _id: "task", seq: 5 },
  ]);

  await Task.create([
    { taskNumber: "TMS-0001", title: "Set up project repository", status: "done", priority: "major", assignedTo: asha._id, createdBy: manager._id, completedAt: new Date() },
    { taskNumber: "TMS-0002", title: "Design login page", status: "in-progress", priority: "critical", assignedTo: asha._id, createdBy: manager._id, dueDate: daysFromNow(2) },
    { taskNumber: "TMS-0003", title: "Write API docs", status: "next", priority: "medium", assignedTo: ravi._id, createdBy: manager._id, dueDate: daysFromNow(5) },
    { taskNumber: "TMS-0004", title: "Fix date bug in reports", status: "review", priority: "minor", assignedTo: ravi._id, createdBy: manager._id, dueDate: daysFromNow(-1) },
    { taskNumber: "TMS-0005", title: "Learn Angular signals", status: "backlog", priority: "minor", assignedTo: ravi._id, createdBy: ravi._id },
  ]);

  console.log("Seeded. Log in with:");
  console.log("  manager@example.com / password123 (manager)");
  console.log("  asha@example.com    / password123 (employee)");
  console.log("  ravi@example.com    / password123 (employee)");
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
