const Counter = require("../models/Counter");

// Atomically increments a named counter and returns the new number
const nextSequence = async (name) => {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return counter.seq;
};

// "TMS-0007"
const generateTaskNumber = async () =>
  `TMS-${String(await nextSequence("task")).padStart(4, "0")}`;

// "EMP-003"
const generateEmployeeCode = async () =>
  `EMP-${String(await nextSequence("employee")).padStart(3, "0")}`;

// Makes user input safe to put inside a RegExp
const escapeRegex = (text = "") => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Collapses repeated spaces and trims
const cleanText = (text) =>
  typeof text === "string" ? text.trim().replace(/\s+/g, " ") : text;

// Midnight UTC today. The frontend sends due dates as "YYYY-MM-DD" (= midnight UTC),
// so comparing in UTC keeps "today" from counting as "in the past".
const startOfToday = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

module.exports = {
  generateTaskNumber,
  generateEmployeeCode,
  escapeRegex,
  cleanText,
  startOfToday,
};
