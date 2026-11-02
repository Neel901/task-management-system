const router = require("express").Router();
const { getStats, getRecentTasks } = require("../controllers/dashboardController");
const { protect } = require("../middleware/auth");

router.get("/stats", protect, getStats);
router.get("/recent", protect, getRecentTasks);

module.exports = router;
