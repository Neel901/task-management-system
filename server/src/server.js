require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:4200" }));
app.use(express.json());
// Express 5 leaves req.body undefined when no JSON was sent; default it to {}
app.use((req, res, next) => {
  req.body ??= {};
  next();
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/tasks", require("./routes/taskRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/users", require("./routes/userRoutes"));

// Unknown routes
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Errors thrown in any route end up here (Express 5 catches async errors for us)
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: "Duplicate value" });
  }
  res.status(500).json({ message: "Something went wrong" });
});

const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
});
