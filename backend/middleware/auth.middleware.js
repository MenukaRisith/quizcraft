const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

function requireAuth(req, res, next) {
  // Check if Authorization header is provided and starts with "Bearer "
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1]; // Extract token from "Bearer <token>"

  try {
    // Verify the token using the secret key
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach decoded user data to the request object
    next(); // Allow the request to proceed
  } catch (err) {
    // Catch errors like token expiration or invalid token
    console.error("JWT verification failed:", err.message);
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}

module.exports = requireAuth;
