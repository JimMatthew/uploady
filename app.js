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
const { 
  login_post, 
  setup_post,
  requireSetupComplete 
} = require("./controllers/setupController");
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

// ─── Express App ──────────────────────────────────────────────────────────────

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Static Files ─────────────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "client/build")));

app.post("/apilogin", login_post);
app.post("/setup", setup_post);

app.use(requireSetupComplete);

app.use("/", setupRoutes);
app.use("/sftp", setupSftpRoutes);

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
  console.log(
    `Server running on port ${PORT} (${USE_HTTPS ? "https" : "http"})`,
  );
});

module.exports = app;
