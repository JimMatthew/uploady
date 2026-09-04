const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { users } = require("../db");
const JWT_SECRET = process.env.JWT_SECRET;
const settingsService = require("../services/settingsService");
/**
 * Hashes a plaintext password using PBKDF2 with a random salt.
 * @param {string} password
 * @returns {{ salt: string, hash: string }}
 */
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return { salt, hash };
};

/**
 * Verifies a plaintext password against a stored salt and hash.
 * @param {string} password
 * @param {string} salt
 * @param {string} storedHash
 * @returns {boolean}
 */
const verifyPassword = (password, salt, storedHash) => {
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return hash === storedHash;
};

/**
 * GET /setup
 */
const setup_get = async (req, res) => {
  const exists = await users.exists();
  if (exists) return res.redirect("/");
  res.sendFile(
    require("path").join(__dirname, "../client/build", "index.html"),
  );
};

/**
 * POST /setup
 * Creates the initial admin user.
 */
const setup_post = async (req, res) => {
  try {
    const exists = await users.exists();
    if (exists) {
      return res.status(403).json({ error: "Setup already complete" });
    }

    const { username, password } = req.body;
    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({ error: "Username and password required" });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    const { salt, hash } = hashPassword(password);
    const user = await users.create({
      username: username.trim(),
      passwordHash: hash,
      passwordSalt: salt,
    });

    const settings = await settingsService.getSettings();
    // log the user in immediately
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
      },
      JWT_SECRET,
      {
        expiresIn: settings.session.jwtLifetimeMinutes * 60,
      },
    );

    res.status(201).json({ token });
  } catch (err) {
    console.error("Setup error:", err);
    res.status(500).json({ error: "Setup failed" });
  }
};

/**
 * POST /apilogin
 * Authenticates against the DB user
 */
const login_post = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await users.findByUsername(username);
    if (
      !user ||
      !verifyPassword(password, user.passwordSalt, user.passwordHash)
    ) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const settings = await settingsService.getSettings();

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
      },
      JWT_SECRET,
      {
        expiresIn: settings.session.jwtLifetimeMinutes * 60,
      },
    );

    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
};

/**
 * Middleware — redirects to /setup if no admin user exists yet.
 * Applied before all app routes so first-run is handled automatically.
 */
const requireSetupComplete = async (req, res, next) => {
  if (
    req.path === "/setup" ||
    req.path === "/apilogin" ||
    req.path.startsWith("/static/") ||
    req.path === "/favicon.ico" ||
    req.path === "/manifest.json"
  ) {
    return next();
  }

  const exists = await users.exists();
  if (!exists) {
    if (req.accepts("html")) return res.redirect("/setup");
    return res.status(428).json({ error: "Setup required" });
  }

  next();
};

module.exports = {
  setup_get,
  setup_post,
  login_post,
  requireSetupComplete,
  verifyPassword,
  hashPassword,
};
