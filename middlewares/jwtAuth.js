const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set");
  process.exit(1);
}

/**
 * Express middleware that authenticates requests via a JWT.
 * Accepts the token in two ways to support both API calls and direct
 * browser navigation (e.g. file downloads, PDF iframes):
 *   - Authorization header: "Bearer <token>"
 *   - Query parameter:      ?token=<token>
 *
 * On success, attaches the decoded payload to req.user and calls next().
 * On failure, responds with 401 (missing) or 403 (invalid/expired).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1] || req.query.token;

  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}

module.exports = authenticateJWT;