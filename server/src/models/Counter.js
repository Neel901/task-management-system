const mongoose = require("mongoose");

// Keeps a running number per name, used to build task numbers like TMS-0001
const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model("Counter", counterSchema);
