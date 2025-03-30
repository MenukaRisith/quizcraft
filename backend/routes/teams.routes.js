const express = require("express");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const db = require("../config/db.config");
const validator = require("validator");

const router = express.Router();

// === Rate Limiter: 10 requests per hour per IP ===
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, error: "Too many registrations from this IP. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// === Token Generator ===
const generateToken = () => {
  return crypto.randomBytes(24).toString("hex");
};

// === POST /api/teams/register ===
router.post("/register", registerLimiter, async (req, res) => {
  const { quiz_id, team_name, members } = req.body;

  if (
    !quiz_id ||
    !team_name ||
    !Array.isArray(members) ||
    members.length === 0 ||
    !validator.isLength(team_name, { min: 3, max: 100 })
  ) {
    return res.status(400).json({ success: false, error: "Invalid input" });
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const sanitizedTeamName = validator.escape(team_name.trim());

    // ✅ 1. Insert Team with quiz_id
    const [teamResult] = await connection.query(
      "INSERT INTO teams (team_name, quiz_id) VALUES (?, ?)",
      [sanitizedTeamName, quiz_id]
    );
    const team_id = teamResult.insertId;

    let firstUserId = null;

    // ✅ 2. Insert Users (no password)
    for (let i = 0; i < members.length; i++) {
      const name = validator.escape(members[i].name?.trim() || "");
      const email = members[i].email?.trim().toLowerCase();

      if (!name || !email || !validator.isEmail(email)) {
        await connection.rollback();
        return res.status(400).json({ success: false, error: "Invalid member name or email" });
      }

      const [userResult] = await connection.query(
        `INSERT INTO users (name, email, password_hash, team_id)
         VALUES (?, ?, NULL, ?)`,
        [name, email, team_id]
      );

      if (i === 0) firstUserId = userResult.insertId;
    }

    if (!firstUserId) {
      await connection.rollback();
      return res.status(500).json({ success: false, error: "Failed to create user" });
    }

    // ✅ 3. Generate and store token
    const token = generateToken();
    await connection.query(
      `INSERT INTO access_tokens (token, quiz_id, user_id, team_id, is_used)
       VALUES (?, ?, ?, ?, 0)`,
      [token, quiz_id, firstUserId, team_id]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "✅ Team registered successfully. Copy and save the token below.",
      team_id,
      user_id: firstUserId,
      token,
    });
  } catch (err) {
    await connection.rollback();
    console.error("Error registering team:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, error: "Team name or email already exists" });
    }

    return res.status(500).json({ success: false, error: "Server error" });
  } finally {
    connection.release();
  }
});

module.exports = router;
