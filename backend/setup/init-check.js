const fs = require("fs");
const path = require("path");

const initFlag = path.join(__dirname, "../.quizcraft-initialized");

module.exports = function isInitialized() {
  return fs.existsSync(initFlag);
};
