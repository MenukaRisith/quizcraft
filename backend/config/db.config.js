// config/db.config.js
const mysql = require("mysql2"); // Make sure to use mysql2

// Create a connection pool (recommended for production)
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "quizcraft",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Use promise API with the pool
const db = pool.promise();

module.exports = db;
