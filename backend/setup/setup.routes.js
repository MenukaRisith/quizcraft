const fs = require("fs");
const path = require("path");
const router = require("express").Router();
const setup = require("./setup.controller");

// Setup handler
router.post("/", setup);

// Status checker
router.get("/status", (req, res) => {
  const flag = path.join(__dirname, "../.quizcraft-initialized");
  const initialized = fs.existsSync(flag);
  res.json({ initialized });
});

module.exports = router;
