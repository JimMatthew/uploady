import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import cors from "cors";
import express from "express";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { WebSocketServer } from "ws";

import { logger } from "./logging";
import { init } from "./db";
import {
  config,
  type AppConfig,
} from "./config/config";

import sshSessionHandler from "./controllers/ssh_session";
import setupRoutes from "./routes/route";
import setupSftpRoutes from "./routes/sftpRouter";
import setupJobRoutes from "./routes/jobRouter";
import setupSettingsRoutes from "./routes/settingsRouter";
import setupArchiveRoutes from "./routes/archiveRouter";
import setupActionsRoutes from "./routes/actionRouter";
import setupNoteRoutes from "./routes/noteRouter";

import {
  login_post,
  setup_post,
  requireSetupComplete,
} from "./controllers/setupController";

const log = logger.child("APP");

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

app.use(express.static(path.resolve("public")));

app.use(
  express.static(path.resolve("client/dist"), {
    index: false,
  }),
);

// ─── Pre-Setup Routes ─────────────────────────────────────────────────────────
//
// These routes must remain accessible before a user exists.

app.post("/apilogin", login_post);

app.post("/setup", setup_post);

// ─── Setup Guard ──────────────────────────────────────────────────────────────

app.use(requireSetupComplete);

// ─── Application Routes ───────────────────────────────────────────────────────

app.use("/", setupRoutes);

app.use("/", setupJobRoutes);

app.use("/sftp", setupSftpRoutes);

app.use("/api/settings", setupSettingsRoutes);

app.use("/api/archive", setupArchiveRoutes);

app.use("/api/actions", setupActionsRoutes);

app.use("/api/notes", setupNoteRoutes);

// ─── API 404 Guard ────────────────────────────────────────────────────────────

const api404Handler: RequestHandler = (req, res, next) => {
  const isApiRequest =
    req.path.startsWith("/api/") ||
    req.path.startsWith("/sftp/api/") ||
    req.path.startsWith("/sftp/server-") ||
    req.path === "/apilogin" ||
    req.path.startsWith("/settings");

  if (!isApiRequest) {
    next();
    return;
  }

  res.status(404).json({
    error: "API endpoint not found",
  });
};

app.use(api404Handler);

// ─── SPA Catch-All ────────────────────────────────────────────────────────────

app.get("*", (_req, res) => {
  res.sendFile(path.resolve("client/dist/index.html"));
});

// ─── Error Handling ───────────────────────────────────────────────────────────

interface AppError extends Error {
  status?: number;
}

const errorHandler: ErrorRequestHandler = (
  error: AppError,
  req,
  res,
  _next,
) => {
  log.error("Request failed", {
    method: req.method,
    path: req.path,
    status: error.status ?? 500,
    error,
  });

  res.status(error.status ?? 500).json({
    error: error.message,
  });
};

app.use(errorHandler);

// ─── Server ───────────────────────────────────────────────────────────────────

function createServer(config: AppConfig): http.Server | https.Server {
  if (!config.server.https.enabled) {
    return http.createServer(app);
  }

  return https.createServer(
    {
      key: fs.readFileSync(config.server.https.keyPath),
      cert: fs.readFileSync(config.server.https.certPath),
    },
    app,
  );
}

// ─── Startup ──────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  try {
    
    await init();

    const server = createServer(config);

    const wss = new WebSocketServer({
      server,
    });

    wss.on("connection", sshSessionHandler);

    server.listen(config.server.port, () => {
      log.info("Server started", {
        hostname: config.server.hostname,
        port: config.server.port,
        protocol: config.server.https.enabled ? "https" : "http",
      });
    });
  } catch (error) {
    log.fatal("Application startup failed", {
      error,
    });

    process.exit(1);
  }
}

void start();

export default app;
