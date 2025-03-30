const fs = require("fs");
const path = require("path");

function writeEnvFile(config) {
  const envPath = path.join(__dirname, "../.env");
  const content = `
PORT=5000
DB_HOST=${config.dbHost}
DB_USER=${config.dbUser}
DB_PASS=${config.dbPassword}
DB_NAME=${config.dbName}
JWT_SECRET=${config.jwtSecret}
  `.trim();

  fs.writeFileSync(envPath, content);
}

module.exports = writeEnvFile;
