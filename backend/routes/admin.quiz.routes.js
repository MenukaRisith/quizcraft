const express = require("express");
const requireAuth = require("../middleware/auth.middleware");
const restrictToRoles = require("../middleware/role.middleware");

module.exports = function (io) {
  const router = express.Router();
  const controller = require("../controllers/admin.quiz.controller")(io);

  // ✅ Health Check
  router.get("/", controller.healthCheck);

  // 🔍 Fetch active teams in the last 15s
  router.get(
    "/:quizId/live-teams",
    requireAuth,
    restrictToRoles("admin", "coordinator"),
    controller.getLiveTeams
  );

  // 🧾 Fetch audit logs of a specific team
  router.get(
    "/:quizId/team/:teamId/logs",
    requireAuth,
    restrictToRoles("admin", "coordinator"),
    controller.getLogs
  );

  // ▶️ Start quiz
  router.patch(
    "/:quizId/start",
    requireAuth,
    restrictToRoles("admin", "coordinator"),
    controller.startQuiz
  );

  // ⏹️ Stop quiz
  router.patch(
    "/:quizId/stop",
    requireAuth,
    restrictToRoles("admin", "coordinator"),
    controller.stopQuiz
  );

  // 🔒 Manually lock a team
  router.patch(
    "/:quizId/team/:teamId/lock",
    requireAuth,
    restrictToRoles("admin", "coordinator"),
    controller.lockTeam
  );

  // 🔓 Unlock a team
  router.patch(
    "/:quizId/unlock-team/:teamId",
    requireAuth,
    restrictToRoles("admin", "coordinator"),
    controller.unlockTeam
  );

  // 🛑 Get all locked teams with reason
  router.get(
    "/:quizId/locked-teams",
    requireAuth,
    restrictToRoles("admin", "coordinator"),
    controller.getLockedTeams
  );

  router.get("/:quizId/leaderboard", controller.getLeaderboard);

  // 🔌 Initialize WebSocket event listeners
  controller.socketEvents();

  return router;
};
