const express = require("express");
const router = express.Router();
const db = require("../config/db.config");
const requireAuth = require("../middleware/auth.middleware");
const restrictToRoles = require("../middleware/role.middleware");
const crypto = require("crypto");

// === AES Encryption Setup ===
const algorithm = "aes-256-cbc";
const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");

const encryptText = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
};

const decryptText = (encryptedText) => {
  const [ivHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

// === Create Quiz ===
router.post("/create", requireAuth, restrictToRoles("admin", "coordinator"), async (req, res) => {
  const { title, description, start_time, end_time, allow_team_participation } = req.body;

  if (!title || !start_time || !end_time) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO quizzes (title, description, start_time, end_time, allow_team_participation, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description, start_time, end_time, allow_team_participation, req.user.id]
    );

    res.json({ success: true, quizId: result.insertId });
  } catch (err) {
    console.error("Create quiz error:", err);
    res.status(500).json({ success: false, error: "Internal error" });
  }
});

// === Paginated Quizzes ===
router.get("/", requireAuth, async (req, res) => {
  const { role, id: userId } = req.user;
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const offset = (page - 1) * pageSize;

  try {
    let quizzesQuery = "";
    let countQuery = "";
    let queryParams = [];
    let countParams = [];

    if (role === "admin") {
      quizzesQuery = `SELECT * FROM quizzes ORDER BY created_at DESC LIMIT ?, ?`;
      countQuery = `SELECT COUNT(*) AS total FROM quizzes`;
      queryParams = [offset, pageSize];
    } else if (role === "coordinator") {
      quizzesQuery = `
        SELECT DISTINCT q.*
        FROM quizzes q
        LEFT JOIN quiz_coordinators qc ON q.id = qc.quiz_id
        WHERE q.created_by = ? OR qc.user_id = ?
        ORDER BY q.created_at DESC
        LIMIT ?, ?
      `;
      countQuery = `
        SELECT COUNT(DISTINCT q.id) AS total
        FROM quizzes q
        LEFT JOIN quiz_coordinators qc ON q.id = qc.quiz_id
        WHERE q.created_by = ? OR qc.user_id = ?
      `;
      queryParams = [userId, userId, offset, pageSize];
      countParams = [userId, userId];
    } else {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const [quizzes] = await db.query(quizzesQuery, queryParams);
    const [count] = await db.query(countQuery, countParams);

    res.json({
      success: true,
      quizzes,
      pagination: {
        page,
        totalPages: Math.ceil(count[0].total / pageSize),
        totalItems: count[0].total,
      },
    });
  } catch (err) {
    console.error("Fetch quizzes error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// === Add Question ===
router.post("/:quizId/questions", requireAuth, restrictToRoles("admin", "coordinator"), async (req, res) => {
  const { quizId } = req.params;
  const { question, options, correct_option } = req.body;

  if (!question || !Array.isArray(options) || options.length !== 4 || typeof correct_option !== "number") {
    return res.status(400).json({ success: false, error: "Invalid question format" });
  }

  try {
    const encrypted = encryptText(question);
    const [result] = await db.query(
      `INSERT INTO questions (quiz_id, encrypted_question, options_json, correct_option_index)
       VALUES (?, ?, ?, ?)`,
      [quizId, encrypted, JSON.stringify(options), correct_option]
    );

    res.json({ success: true, questionId: result.insertId });
  } catch (err) {
    console.error("Add question error:", err);
    res.status(500).json({ success: false, error: "Error saving question" });
  }
});

// === Publish Quiz & Open Registration ===
router.post("/:quizId/open-registration", requireAuth, restrictToRoles("admin", "coordinator"), async (req, res) => {
  const { quizId } = req.params;
  const { max_team_members, registration_deadline } = req.body;

  if (!max_team_members || !registration_deadline) {
    return res.status(400).json({ success: false, error: "Missing fields" });
  }

  try {
    await db.query(
      `UPDATE quizzes SET is_published = 1, max_team_members = ?, registration_deadline = ? WHERE id = ?`,
      [max_team_members, registration_deadline, quizId]
    );

    const url = `${process.env.BASE_URL || "http://localhost:5000"}/register/${quizId}`;
    res.json({ success: true, registration_url: url });
  } catch (err) {
    console.error("Publish error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// === Get Quiz Details ===
router.get("/:quizId", async (req, res) => {
  try {
    const [quiz] = await db.query(
      `SELECT id, title, description, start_time, end_time, allow_team_participation, max_team_members, is_active, is_published
       FROM quizzes WHERE id = ? LIMIT 1`,
      [req.params.quizId]
    );

    if (!quiz.length) return res.status(404).json({ success: false, error: "Not found" });

    res.json({ success: true, quiz: quiz[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to load quiz" });
  }
});

// === Get All Questions for a Quiz ===
router.get("/:quizId/questions", requireAuth, restrictToRoles("admin", "coordinator"), async (req, res) => {
  const { quizId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT id, encrypted_question, options_json, correct_option_index FROM questions WHERE quiz_id = ? ORDER BY id ASC`,
      [quizId]
    );

    const questions = rows.map((q) => ({
      id: q.id,
      text: decryptText(q.encrypted_question),
      options: JSON.parse(q.options_json),
      correct_option_index: q.correct_option_index,
    }));

    res.json({ success: true, questions });
  } catch (err) {
    console.error("❌ Failed to fetch questions:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});


// === Verify Token & Mark Used ===
router.post("/verify-token", async (req, res) => {
  const { token, quiz_id } = req.body;
  if (!token || !quiz_id) return res.status(400).json({ success: false, error: "Missing inputs" });

  try {
    const [result] = await db.query(
      `SELECT id, user_id, team_id FROM access_tokens WHERE token = ? AND quiz_id = ? AND is_used = 0`,
      [token, quiz_id]
    );

    if (!result.length) return res.status(403).json({ success: false, error: "Invalid/Used token" });

    await db.query(`UPDATE access_tokens SET is_used = 1 WHERE id = ?`, [result[0].id]);

    res.json({ success: true, user_id: result[0].user_id, team_id: result[0].team_id });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// === Get Question by Index (1 by 1) ===
router.get("/:quizId/question/:index", async (req, res) => {
  const { quizId, index } = req.params;

  try {
    const [q] = await db.query(
      `SELECT id, encrypted_question, options_json FROM questions WHERE quiz_id = ? ORDER BY id ASC LIMIT 1 OFFSET ?`,
      [quizId, parseInt(index)]
    );

    if (!q.length) return res.json({ success: true, question: null });

    res.json({
      success: true,
      question: {
        id: q[0].id,
        question: decryptText(q[0].encrypted_question),
        options: JSON.parse(q[0].options_json),
      },
    });
  } catch (err) {
    console.error("Get question error:", err);
    res.status(500).json({ success: false, error: "Failed to load question" });
  }
});

// === Submit Answer Per Question ===
router.post("/:quizId/submit-answer", async (req, res) => {
  const { quizId } = req.params;
  const { question_id, selected_option } = req.body;
  const token = req.headers.authorization?.split(" ")[1];

  if (!question_id || selected_option === undefined || !token) {
    return res.status(400).json({ success: false, error: "Missing input" });
  }

  try {
    const [tokenResult] = await db.query(
      `SELECT team_id FROM access_tokens WHERE token = ? LIMIT 1`,
      [token]
    );
    if (!tokenResult.length) return res.status(403).json({ success: false, error: "Invalid token" });

    const team_id = tokenResult[0].team_id;

    await db.query(
      `INSERT INTO submissions (quiz_id, team_id, answers_json)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE answers_json = JSON_ARRAY_APPEND(answers_json, '$', JSON_OBJECT("q", ?, "a", ?))`,
      [quizId, team_id, JSON.stringify([{ q: question_id, a: selected_option }]), question_id, selected_option]
    );

    res.json({ success: true, message: "Answer submitted" });
  } catch (err) {
    console.error("Submit error:", err);
    res.status(500).json({ success: false, error: "Submission failed" });
  }
});

// === Get Quiz Results for a Team ===
router.get("/:quizId/team/:teamId/results", async (req, res) => {
  const { quizId, teamId } = req.params;

  try {
    // 1. Fetch all submissions for the team & quiz
    const [submissions] = await db.query(
      `SELECT answers_json FROM submissions WHERE quiz_id = ? AND team_id = ?`,
      [quizId, teamId]
    );

    if (!submissions.length) {
      return res.json({ success: true, answers: [], score: 0, outOf: 0 });
    }

    // 2. Combine all submitted answers into one array
    const allAnswers = submissions.flatMap(sub => {
      try {
        return JSON.parse(sub.answers_json || "[]");
      } catch {
        return [];
      }
    });

    // 3. Use only the latest answer per question
    const uniqueAnswersMap = new Map();
    for (let i = allAnswers.length - 1; i >= 0; i--) {
      const entry = allAnswers[i];
      if (!uniqueAnswersMap.has(entry.q)) {
        uniqueAnswersMap.set(entry.q, entry);
      }
    }

    // 4. Fetch all questions of the quiz
    const [questions] = await db.query(
      `SELECT id, encrypted_question, options_json, correct_option_index
       FROM questions WHERE quiz_id = ?`,
      [quizId]
    );

    const questionMap = new Map();
    questions.forEach(q => {
      questionMap.set(q.id, {
        question: decryptText(q.encrypted_question),
        options: JSON.parse(q.options_json),
        correct_option_index: q.correct_option_index
      });
    });

    // 5. Map answers with question details and correctness
    const answersWithResults = [...uniqueAnswersMap.values()].map(entry => {
      const q = questionMap.get(entry.q);
      if (!q) return null;

      return {
        question_id: entry.q,
        question: q.question,
        selected_option: entry.a,
        correct_option: q.correct_option_index,
        is_correct: entry.a === q.correct_option_index,
        options: q.options
      };
    }).filter(Boolean);

    // 6. Calculate score
    const correctCount = answersWithResults.filter(ans => ans.is_correct).length;
    const totalQuestions = questions.length;
    const score = correctCount * 10;
    const outOf = totalQuestions * 10;

    res.json({
      success: true,
      score,
      outOf,
      result: `${score} / ${outOf}`,
      answers: answersWithResults
    });
  } catch (err) {
    console.error("❌ Error fetching quiz results:", err);
    res.status(500).json({ success: false, error: "Failed to fetch results" });
  }
});

module.exports = router;
