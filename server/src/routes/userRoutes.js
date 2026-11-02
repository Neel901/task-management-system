const router = require("express").Router();
const { getEmployees, getEmployeeStats } = require("../controllers/userController");
const { protect, allowRoles } = require("../middleware/auth");

router.use(protect, allowRoles("manager"));

router.get("/employees", getEmployees);
router.get("/employees/stats", getEmployeeStats);

module.exports = router;
