const fs = require("fs");
const path = require("path");

async function runSQLFromFile(connection, filePath) {
  const sql = fs.readFileSync(filePath, "utf8");
  const statements = sql.split(/;\s*$/gm).filter(s => s.trim().length > 0);
  for (const statement of statements) {
    await connection.query(statement);
  }
}

module.exports = runSQLFromFile;
