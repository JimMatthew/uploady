import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import cors from "cors";
import express from "express";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { WebSocketServer } from "ws";

import { init } from "./db";

import sshSessionHandler from "./controllers/ssh_session";
import setupRoutes from "./routes/route";
import setupSftpRoutes from "./routes/sftpRouter";
import setupJobRoutes from "./routes/jobRouter";
import setupSettingsRoutes from "./routes/settingsRouter";
import setupArchiveRoutes from "./routes/archiveRouter";
import setupActionsRoutes from "./routes/actionRouter";

import {
  login_post,
  setup_post,
  requireSetupComplete,
} from "./controllers/setupController";

// ─── Config ───────────────────────────────────────────────────────────────────

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    console.error(`FATAL: ${name} environment variable is not set`);

    process.exit(1);
  }

  return value;
}

const PORT = process.env.PORT ?? "3001";

const USE_HTTPS = process.env.USE_HTTPS === "true";

// Validate this at startup even though JWT handling
// itself lives in the authentication code.
getRequiredEnv("JWT_SECRET");

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
  _req,
  res,
  _next,
) => {
  console.error("Error:", error.message);

  res.status(error.status ?? 500).json({
    error: error.message,
  });
};

app.use(errorHandler);

// ─── Server ───────────────────────────────────────────────────────────────────

function createServer(): http.Server | https.Server {
  if (!USE_HTTPS) {
    return http.createServer(app);
  }

  const keyPath = getRequiredEnv("HTTPS_KEY");

  const certPath = getRequiredEnv("HTTPS_CERT");

  return https.createServer(
    {
      key: fs.readFileSync(keyPath),

      cert: fs.readFileSync(certPath),
    },
    app,
  );
}

const server = createServer();

const wss = new WebSocketServer({
  server,
});

wss.on("connection", sshSessionHandler);

// ─── Startup ──────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  try {
    await init();

    server.listen(PORT, () => {
      console.log(
        `Server running on port ${PORT} ` + `(${USE_HTTPS ? "https" : "http"})`,
      );
    });
  } catch (error) {
    console.error("Failed to initialize database:", error);

    process.exit(1);
  }
}

void start();

export default app;
