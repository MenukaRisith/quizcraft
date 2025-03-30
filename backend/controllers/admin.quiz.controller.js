const db = require("../config/db.config");

const liveTeams = new Map(); // quizId => Map<teamId, lastSeen>
const cheatCounts = new Map(); // "quizId:teamId" => violation count
const CHEATING_THRESHOLD = 3; //

module.exports = (io) => ({
  healthCheck: (req, res) => {
    res.json({ success: true, message: "✅ Admin Quiz API is running!" });
  },

  getLiveTeams: async (req, res) => {
    const quizId = req.params.quizId;
    const teamMap = liveTeams.get(quizId) || new Map();
    const now = Date.now();
    const activeTeamIds = [];

    for (const [teamId, lastSeen] of teamMap.entries()) {
      if (now - lastSeen <= 15000) activeTeamIds.push(teamId);
    }

    if (activeTeamIds.length === 0) return res.json({ success: true, teams: [] });

    try {
      const [teams] = await db.query(
        `SELECT id, team_name, is_locked FROM teams WHERE id IN (?)`,
        [activeTeamIds]
      );

      const teamsWithTime = teams.map(t => ({
        ...t,
        lastSeen: new Date().toISOString(),
      }));

      res.json({ success: true, teams: teamsWithTime });
    } catch (err) {
      console.error("❌ Error fetching live teams:", err);
      res.status(500).json({ success: false, error: "Failed to fetch live teams" });
    }
  },

  getLogs: async (req, res) => {
    const { quizId, teamId } = req.params;
    const key = `${quizId}:${teamId}`;

    try {
      const [logs] = await db.query(
        `SELECT event_type, event_data, created_at
         FROM audit_logs
         WHERE quiz_id = ? AND team_id = ?
         ORDER BY created_at DESC`,
        [quizId, teamId]
      );

      const formattedLogs = logs.map(log => ({
        event_type: log.event_type,
        event_data: JSON.parse(log.event_data),
        timestamp: log.created_at,
      }));

      const violations = formattedLogs.filter(l => l.event_type === "cheating-detected").length;
      cheatCounts.set(key, violations); // sync count from DB

      res.json({
        success: true,
        logs: formattedLogs,
        violations,
        threshold: CHEATING_THRESHOLD,
      });
    } catch (err) {
      console.error("❌ Error fetching logs:", err);
      res.status(500).json({ success: false, error: "Failed to fetch logs" });
    }
  },

  startQuiz: async (req, res) => {
    const quizId = req.params.quizId;
    try {
      await db.query(`UPDATE quizzes SET is_active = 1 WHERE id = ?`, [quizId]);
      res.json({ success: true, message: "✅ Quiz started" });
    } catch (err) {
      console.error("❌ Error starting quiz:", err);
      res.status(500).json({ success: false, error: "Failed to start quiz" });
    }
  },

  stopQuiz: async (req, res) => {
    const quizId = req.params.quizId;
    try {
      await db.query(`UPDATE quizzes SET is_active = 0 WHERE id = ?`, [quizId]);
      liveTeams.delete(quizId);
      res.json({ success: true, message: "🛑 Quiz stopped" });
    } catch (err) {
      console.error("❌ Error stopping quiz:", err);
      res.status(500).json({ success: false, error: "Failed to stop quiz" });
    }
  },

  lockTeam: async (req, res) => {
    const { quizId, teamId } = req.params;
    const reason = req.body.reason || "Locked by admin";

    try {
      await db.query(
        `INSERT INTO audit_logs (quiz_id, team_id, event_type, event_data)
         VALUES (?, ?, 'cheating-detected', ?)`,
        [quizId, teamId, JSON.stringify({ reason })]
      );

      await db.query(
        `UPDATE teams SET is_locked = TRUE WHERE id = ? AND quiz_id = ?`,
        [teamId, quizId]
      );

      io.emit(`team-log:${quizId}:${teamId}`, {
        event_type: "cheating-detected",
        event_data: { reason },
        timestamp: new Date().toISOString(),
      });

      io.emit(`team-locked:${quizId}`, {
        team_id: parseInt(teamId),
        reason,
        time: new Date().toISOString(),
      });

      res.json({ success: true, message: "Team locked successfully" });
    } catch (err) {
      console.error("❌ Error locking team manually:", err);
      res.status(500).json({ success: false, error: "Failed to lock team" });
    }
  },

  getLockedTeams: async (req, res) => {
    const quizId = req.params.quizId;

    try {
      const [locked] = await db.query(
        `SELECT t.id, t.team_name,
         (
           SELECT event_data FROM audit_logs 
           WHERE team_id = t.id AND quiz_id = ? AND event_type = 'cheating-detected'
           ORDER BY created_at DESC LIMIT 1
         ) AS reason,
         (
           SELECT created_at FROM audit_logs 
           WHERE team_id = t.id AND quiz_id = ? AND event_type = 'cheating-detected'
           ORDER BY created_at DESC LIMIT 1
         ) AS time
         FROM teams t
         WHERE t.quiz_id = ? AND t.is_locked = TRUE`,
        [quizId, quizId, quizId]
      );

      const formatted = locked.map(team => ({
        id: team.id,
        team_name: team.team_name,
        reason: (() => {
          try {
            const parsed = JSON.parse(team.reason);
            return parsed.reason || "No reason provided";
          } catch {
            return "Unknown";
          }
        })(),
        time: team.time,
      }));

      res.json({ success: true, teams: formatted });
    } catch (err) {
      console.error("❌ Error fetching locked teams:", err);
      res.status(500).json({ success: false, error: "Failed to fetch locked teams" });
    }
  },

  unlockTeam: async (req, res) => {
    const { quizId, teamId } = req.params;

    try {
      await db.query(
        `UPDATE teams SET is_locked = FALSE WHERE id = ? AND quiz_id = ?`,
        [teamId, quizId]
      );

      cheatCounts.set(`${quizId}:${teamId}`, 0); // reset violation count

      io.emit(`team-unlocked:${quizId}`, {
        team_id: parseInt(teamId),
        time: new Date().toISOString(),
      });

      res.json({ success: true, message: "🔓 Team unlocked successfully." });
    } catch (err) {
      console.error("❌ Error unlocking team:", err);
      res.status(500).json({ success: false, error: "Failed to unlock team" });
    }
  },

  getLeaderboard: async (req, res) => {
    const { quizId } = req.params;
  
    try {
      // 1. Fetch all questions for the quiz
      const [questions] = await db.query(
        `SELECT id, encrypted_question, options_json, correct_option_index
         FROM questions WHERE quiz_id = ?`,
        [quizId]
      );
  
      const questionMap = new Map();
      questions.forEach(q => {
        questionMap.set(q.id, {
          correct_option_index: q.correct_option_index
        });
      });
  
      const totalQuestions = questionMap.size;
  
      // 2. Fetch all submissions of the quiz
      const [submissions] = await db.query(
        `SELECT s.team_id, t.team_name, s.answers_json
         FROM submissions s
         JOIN teams t ON t.id = s.team_id
         WHERE s.quiz_id = ? AND t.quiz_id = ?`,
        [quizId, quizId]
      );
  
      const teamMap = new Map(); // team_id => { team_name, answers[] }
  
      for (const sub of submissions) {
        const parsed = JSON.parse(sub.answers_json || "[]");
  
        if (!teamMap.has(sub.team_id)) {
          teamMap.set(sub.team_id, {
            team_name: sub.team_name,
            answers: [],
          });
        }
  
        teamMap.get(sub.team_id).answers.push(...parsed);
      }
  
      const leaderboard = [];
  
      for (const [team_id, team] of teamMap.entries()) {
        const latestAnswers = new Map();
  
        // Take latest answer per question (by reversing)
        for (let i = team.answers.length - 1; i >= 0; i--) {
          const entry = team.answers[i];
          if (!latestAnswers.has(entry.q)) {
            latestAnswers.set(entry.q, entry.a);
          }
        }
  
        let correct = 0;
        for (const [qId, selected] of latestAnswers.entries()) {
          const question = questionMap.get(qId);
          if (question && selected === question.correct_option_index) {
            correct += 1;
          }
        }
  
        leaderboard.push({
          team_id,
          team_name: team.team_name,
          score: correct * 10,
          outOf: totalQuestions * 10,
        });
      }
  
      // Sort by score descending
      leaderboard.sort((a, b) => b.score - a.score);
  
      res.json({ success: true, leaderboard });
    } catch (err) {
      console.error("❌ Error generating leaderboard:", err);
      res.status(500).json({ success: false, error: "Failed to fetch leaderboard" });
    }
  },  

  socketEvents: () => {
    io.on("connection", (socket) => {
      socket.on("join-quiz", ({ quiz_id, team_id }) => {
        if (!quiz_id || !team_id) return;
        if (!liveTeams.has(quiz_id)) liveTeams.set(quiz_id, new Map());
        liveTeams.get(quiz_id).set(team_id, Date.now());
        io.emit(`live-teams:${quiz_id}`, [...liveTeams.get(quiz_id).keys()]);
      });

      socket.on("left-quiz", ({ quiz_id, team_id }) => {
        if (liveTeams.has(quiz_id)) {
          liveTeams.get(quiz_id).delete(team_id);
          io.emit(`live-teams:${quiz_id}`, [...liveTeams.get(quiz_id).keys()]);
        }
      });

      socket.on("typing", ({ quiz_id, team_id }) => {
        if (quiz_id && team_id) socket.broadcast.emit("typing", { team_id });
      });

      socket.on("stop-typing", ({ quiz_id, team_id }) => {
        if (quiz_id && team_id) socket.broadcast.emit("stop-typing", { team_id });
      });

      socket.on("log-activity", async ({ quiz_id, team_id, event_type, event_data }) => {
        if (!quiz_id || !team_id || !event_type) return;

        const key = `${quiz_id}:${team_id}`;

        try {
          await db.query(
            `INSERT INTO audit_logs (quiz_id, team_id, event_type, event_data)
             VALUES (?, ?, ?, ?)`,
            [quiz_id, team_id, event_type, JSON.stringify(event_data || {})]
          );

          // Update live tracking
          if (!liveTeams.has(quiz_id)) liveTeams.set(quiz_id, new Map());
          liveTeams.get(quiz_id).set(team_id, Date.now());

          io.emit(`team-log:${quiz_id}:${team_id}`, {
            event_type,
            event_data,
            timestamp: new Date().toISOString(),
          });

          if (event_type === "cheating-detected") {
            const count = (cheatCounts.get(key) || 0) + 1;
            cheatCounts.set(key, count);

            if (count >= CHEATING_THRESHOLD) {
              await db.query(
                `UPDATE teams SET is_locked = TRUE WHERE id = ? AND quiz_id = ?`,
                [team_id, quiz_id]
              );

              io.emit(`team-locked:${quiz_id}`, {
                team_id,
                reason: event_data?.reason || "Cheating threshold exceeded",
                time: new Date().toISOString(),
              });
            }
          }
        } catch (err) {
          console.error("❌ Error saving log activity:", err);
        }
      });

      socket.on("quiz-lock", ({ quiz_id, team_id, reason }) => {
        io.emit(`team-locked:${quiz_id}`, {
          team_id,
          reason,
          time: new Date().toISOString(),
        });
      });
    });
  },
});
