const express = require("express");
const http = require("http");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // You can restrict this in production
    methods: ["GET", "POST"]
  }
});

// === Middleware ===
app.use(cors());
app.use(express.json());

// === Setup Status Endpoint ===
app.get("/api/setup/status", (req, res) => {
  const flag = path.join(__dirname, "./.quizcraft-initialized");
  const initialized = fs.existsSync(flag);
  res.json({ initialized });
});

// === Initialization Check Function ===
const isInitialized = () => {
  const flag = path.join(__dirname, "./.quizcraft-initialized");
  return fs.existsSync(flag);
};

// === Setup Mode APIs ===
if (!isInitialized()) {
  console.log("🛠️  Setup mode enabled. Only setup APIs allowed.");
  app.use("/api/setup", require("./setup/setup.routes"));
} else {
  console.log("✅ QuizCraft initialized. Core routes enabled.");

  // Authentication
  app.use("/api/auth", require("./routes/auth.routes"));

  // Quiz Management (Admin + Coordinator)
  app.use("/api/quizzes", require("./routes/quiz.routes"));

  // Team Registration
  app.use("/api/teams", require("./routes/teams.routes"));

  app.use("/api", require("./routes/quizCoordinator.routes"));

  // Admin Monitoring & Anti-Cheat Console (With Socket.IO)
  app.use("/api/admin/quiz", require("./routes/admin.quiz.routes")(io));
}

// === Socket.IO Events ===
io.on("connection", (socket) => {
  console.log(`📡 WebSocket connected: ${socket.id}`);

  socket.emit("connected", "✅ WebSocket connection established.");

  socket.on("disconnect", () => {
    console.log(`❌ WebSocket disconnected: ${socket.id}`);
  });
});

// === Start Server ===
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("📶 WebSocket server initialized and listening via Socket.IO");
});
