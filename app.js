const fs = require("fs");
const http = require("http");
const https = require("https");
const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const WebSocket = require("ws");
const sshSessionHandler = require("./controllers/ssh_session");
const setupRoutes = require("./routes/route");
const setupSftpRoutes = require("./routes/sftpRouter");

// ─── Config ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const USE_HTTPS = process.env.USE_HTTPS === "true";
const MONGO_URI = process.env.DATABASE;
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const UPLOAD_DIR = path.join(__dirname, "uploads");

// ─── Express App ────────────────────────────────────────────────
const app = express();

// ─── MongoDB ────────────────────────────────────────────────────
mongoose.set("strictPopulate", false);
mongoose.connect(MONGO_URI).catch(console.error);

// ─── Middleware ─────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Static Files ───────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "client/build")));

// ─── Routes ─────────────────────────────────────────────────────
app.use("/", setupRoutes);
app.use("/sftp", setupSftpRoutes);

// ─── Auth API ───────────────────────────────────────────────────
const jwt = require("jsonwebtoken");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return { salt, hash };
}

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

app.post("/apilogin", async (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username);
  if (
    !user ||
    !verifyPassword(password, user.passwordSalt, user.passwordHash)
  ) {
    return res.status(401).json({ message: "Invalid username or password" });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: "8h",
  });

  res.json({ token });
});

// ─── Catch-all ────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

// ─── Error Handling ─────────────────────────────────────────────
app.use((req, res, next) => {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({ error: err.message });
});

// ─── WebSocket + Server Startup ─────────────────────────────────
const server = USE_HTTPS
  ? https.createServer(
      {
        key: fs.readFileSync(process.env.HTTPS_KEY),
        cert: fs.readFileSync(process.env.HTTPS_CERT),
      },
      app
    )
  : http.createServer(app);

const wss = new WebSocket.Server({ server });
wss.on("connection", sshSessionHandler);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
