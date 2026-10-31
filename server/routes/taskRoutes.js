const router = require("express").Router();
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getMeta,
} = require("../controllers/taskController");
const { protect } = require("../middleware/auth");

router.use(protect); // every task route needs a logged-in user

router.get("/meta", getMeta); // must come before "/:id"
router.route("/").get(getTasks).post(createTask);
router.route("/:id").get(getTaskById).patch(updateTask).delete(deleteTask);

module.exports = router;
