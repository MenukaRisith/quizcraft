const fs = require("fs");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const path = require("path");

const writeEnvFile = require("../utils/writeEnvFile");
const runSQLFromFile = require("../utils/runSQLFromFile");

const initFlagPath = path.join(__dirname, "../.quizcraft-initialized");

async function setup(req, res) {
  const {
    dbHost,
    dbUser,
    dbPassword,
    dbName,
    adminName,
    adminEmail,
    adminPassword,
    jwtSecret
  } = req.body;

  try {
    // Connect to MySQL without selecting DB
    const connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword
    });

    // Create the database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.end();

    // Reconnect selecting the new DB
    const db = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      multipleStatements: true
    });

    // Run init.sql
    const sqlPath = path.join(__dirname, "../../database/init.sql");
    await runSQLFromFile(db, sqlPath);

    // Insert admin user
    const hash = await bcrypt.hash(adminPassword, 10);
    await db.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
      [adminName, adminEmail, hash]
    );

    await db.end();

    // Write .env file
    writeEnvFile({ dbHost, dbUser, dbPassword, dbName, jwtSecret });

    // Create flag file
    fs.writeFileSync(initFlagPath, "QuizCraft is initialized.");

    res.status(200).json({ success: true, message: "Setup complete." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = setup;
