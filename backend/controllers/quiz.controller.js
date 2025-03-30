const db = require("../config/db.config");

const createQuiz = async (req, res) => {
  const { title, description, start_time, end_time, allow_team_participation } = req.body;
  const user_id = req.user.id; // set by auth middleware

  if (!title || !start_time || !end_time) {
    return res.status(400).json({ success: false, error: "Required fields missing." });
  }

  try {
    await db.query(
      `INSERT INTO quizzes (title, description, start_time, end_time, allow_team_participation, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description, start_time, end_time, allow_team_participation ? 1 : 0, user_id]
    );

    return res.json({ success: true, message: "Quiz created successfully." });
  } catch (err) {
    console.error("Quiz Creation Error:", err);
    return res.status(500).json({ success: false, error: "Server error." });
  }
};

module.exports = {
  createQuiz,
};
