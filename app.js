const fs = require("fs");
const http = require("http");
const https = require("https");
const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const WebSocket = require("ws");
const sshSessionHandler = require("./controllers/ssh_session");
const setupRoutes = require("./routes/route");
const setupSftpRoutes = require("./routes/sftpRouter");

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
const USE_HTTPS = process.env.USE_HTTPS === "true";
const MONGO_URI = process.env.DATABASE;
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set");
  process.exit(1);
}

if (!MONGO_URI) {
  console.error("FATAL: DATABASE environment variable is not set");
  process.exit(1);
}

// ─── Database ─────────────────────────────────────────────────────────────────

mongoose.set("strictPopulate", false);
mongoose.connect(MONGO_URI).catch((err) => {
  console.error("Failed to connect to MongoDB:", err.message);
  process.exit(1);
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Hashes a plaintext password using PBKDF2 with a random salt.
 * @param {string} password
 * @returns {{ salt: string, hash: string }}
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return { salt, hash };
}

/**
 * Verifies a plaintext password against a stored salt and hash.
 * @param {string} password
 * @param {string} salt
 * @param {string} storedHash
 * @returns {boolean}
 */
function verifyPassword(password, salt, storedHash) {
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return hash === storedHash;
}

const { salt, hash } = hashPassword(process.env.PASSWORD);
const users = [
  {
    id: 1,
    username: process.env.USERNAME,
    passwordSalt: salt,
    passwordHash: hash,
  },
];

// ─── Express App ──────────────────────────────────────────────────────────────

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Static Files ─────────────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "client/build")));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/", setupRoutes);
app.use("/sftp", setupSftpRoutes);

// ─── Login ────────────────────────────────────────────────────────────────────

app.post("/apilogin", (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username);

  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: "8h",
  });

  res.json({ token });
});

// ─── Catch-all ────────────────────────────────────────────────────────────────

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

// ─── Error Handling ───────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({ error: err.message });
});

// ─── Server ───────────────────────────────────────────────────────────────────

const server = USE_HTTPS
  ? https.createServer(
      {
        key: fs.readFileSync(process.env.HTTPS_KEY),
        cert: fs.readFileSync(process.env.HTTPS_CERT),
      },
      app,
    )
  : http.createServer(app);

const wss = new WebSocket.Server({ server });
wss.on("connection", sshSessionHandler);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${USE_HTTPS ? "https" : "http"})`);
});

module.exports = app;