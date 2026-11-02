const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { generateEmployeeCode, cleanText } = require("../utils/helpers");

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  employeeCode: user.employeeCode,
});

// POST /api/auth/register  -> always creates an employee
const register = async (req, res) => {
  const name = cleanText(req.body.name);
  const email = cleanText(req.body.email)?.toLowerCase();
  const { password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }
  if (await User.exists({ email })) {
    return res.status(409).json({ message: "Email is already registered" });
  }

  const user = await User.create({
    name,
    email,
    password,
    role: "employee",
    employeeCode: await generateEmployeeCode(),
  });

  res.status(201).json({ token: signToken(user), user: publicUser(user) });
};

const login = async (req, res) => {
  const email = cleanText(req.body.email)?.toLowerCase();
  const { password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  res.json({ token: signToken(user), user: publicUser(user) });
};

const me = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user: publicUser(user) });
};

module.exports = { register, login, me };
