const bcrypt = require("bcrypt");
const db = require("../config/db.config");
const { generateTokens } = require("../utils/jwt");

exports.registerCoordinator = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: "Name, email, and password are required." });
  }

  const userRole = role === "coordinator" ? "coordinator" : "participant";

  try {
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: "User already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name, email, passwordHash, userRole]
    );

    res.json({ success: true, message: "Coordinator registered successfully." });
  } catch (err) {
    console.error("Error in registerCoordinator:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    const user = users[0];

    if (!user) return res.status(401).json({ success: false, error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ success: false, error: "Invalid credentials" });

    const payload = { id: user.id, email: user.email, role: user.role };
    const tokens = generateTokens(payload);

    res.status(200).json({ success: true, tokens, user: payload });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
