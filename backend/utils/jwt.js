const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_EXPIRY = "1d";
const REFRESH_EXPIRY = "7d";

function generateTokens(payload) {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRY });
  const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRY });
  return { accessToken, refreshToken };
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { generateTokens, verifyToken };
