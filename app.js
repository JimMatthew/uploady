const fs = require("fs");
const http = require("http");
const https = require("https");
const express = require("express");
const cors = require("cors");
const path = require("path");
const WebSocket = require("ws");

const db = require("./db");

const sshSessionHandler = require("./controllers/ssh_session");

const setupRoutes = require("./routes/route");
const setupSftpRoutes = require("./routes/sftpRouter");
const setupJobRoutes = require("./routes/jobRouter");
const setupSettingsRoutes = require("./routes/settingsRouter")
const setupArchiveRoutes = require("./routes/archiveRouter")
const {
  login_post,
  setup_post,
  requireSetupComplete,
} = require("./controllers/setupController");

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

const USE_HTTPS = process.env.USE_HTTPS === "true";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set");

  process.exit(1);
}

// ─── Express App ──────────────────────────────────────────────────────────────

const app = express();

app.use(cors());
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  }),
);

// ─── Static Files ─────────────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, "public")));

app.use(express.static(path.join(__dirname, "client/build")));

app.post("/apilogin", login_post);

app.post("/setup", setup_post);

app.use(requireSetupComplete);

app.use("/", setupRoutes);
app.use("/", setupJobRoutes);
app.use("/sftp", setupSftpRoutes);
app.use("/api/settings", setupSettingsRoutes);
app.use("/api/archive", setupArchiveRoutes);
// ─── API 404 guard ────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  const isApiRequest =
    req.path.startsWith("/api/") ||
    req.path.startsWith("/sftp/api/") ||
    req.path.startsWith("/sftp/server-") ||
    req.path === "/apilogin" ||
    req.path === "/setup" ||
    req.path.startsWith("/settings");

  if (!isApiRequest) {
    return next();
  }

  return res.status(404).json({
    error: "API endpoint not found",
  });
});

// ─── Catch-all ────────────────────────────────────────────────────────────────

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

// ─── Error Handling ───────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error("Error:", err.message);

  res.status(err.status || 500).json({
    error: err.message,
  });
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

const wss = new WebSocket.Server({
  server,
});

wss.on("connection", sshSessionHandler);

// ─── Startup ──────────────────────────────────────────────────────────────────

async function start() {
  try {
    await db.init();

    server.listen(PORT, () => {
      console.log(
        `Server running on port ${PORT} ` + `(${USE_HTTPS ? "https" : "http"})`,
      );
    });
  } catch (err) {
    console.error("Failed to initialize database:", err);

    process.exit(1);
  }
}

start();

module.exports = app;
