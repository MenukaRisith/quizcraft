const express = require("express");
const router = express.Router();
const db = require("../config/db.config");
const requireAuth = require("../middleware/auth.middleware");
const restrictToRoles = require("../middleware/role.middleware");

// === Get all coordinators (admin only) ===
router.get("/coordinators", requireAuth, restrictToRoles("admin"), async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT id, name, email FROM users WHERE role = 'coordinator'`
    );
    res.json({ success: true, coordinators: users });
  } catch (err) {
    console.error("Failed to fetch coordinators:", err);
    res.status(500).json({ success: false, error: "Failed to load coordinators" });
  }
});

// === Assign one or more coordinators to a quiz ===
router.post("/assign-coordinator", requireAuth, restrictToRoles("admin"), async (req, res) => {
  const { quiz_id, coordinator_ids } = req.body;

  if (!quiz_id || !Array.isArray(coordinator_ids)) {
    return res.status(400).json({ success: false, error: "Invalid input" });
  }

  try {
    // Remove existing assignments for this quiz
    await db.query(`DELETE FROM quiz_coordinators WHERE quiz_id = ?`, [quiz_id]);

    // Assign new coordinators
    for (const user_id of coordinator_ids) {
      await db.query(
        `INSERT INTO quiz_coordinators (quiz_id, user_id) VALUES (?, ?)`,
        [quiz_id, user_id]
      );
    }

    res.json({ success: true, message: "Coordinators assigned successfully." });
  } catch (err) {
    console.error("Failed to assign coordinators:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// === Get assigned coordinators for a quiz ===
router.get("/quiz/:quizId/coordinators", requireAuth, restrictToRoles("admin"), async (req, res) => {
  const { quizId } = req.params;

  try {
    const [results] = await db.query(
      `SELECT u.id, u.name, u.email 
       FROM quiz_coordinators qc 
       JOIN users u ON qc.user_id = u.id 
       WHERE qc.quiz_id = ?`,
      [quizId]
    );
    res.json({ success: true, coordinators: results });
  } catch (err) {
    console.error("Failed to get quiz coordinators:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// === Get all quiz-coordinator assignments ===
router.get("/quiz-coordinator-assignments", requireAuth, restrictToRoles("admin"), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT quiz_id, user_id FROM quiz_coordinators`
    );

    const assignments = {};
    for (const row of rows) {
      if (!assignments[row.quiz_id]) {
        assignments[row.quiz_id] = [];
      }
      assignments[row.quiz_id].push(row.user_id);
    }

    res.json({ success: true, assignments });
  } catch (err) {
    console.error("Failed to fetch quiz-coordinator assignments:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
