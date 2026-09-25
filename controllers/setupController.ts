import crypto from "node:crypto";
import path from "node:path";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

import { users } from "../db";
import { getSettings } from "../services/settingsService";
import { config } from "../config/config";
import { getErrorMessage, nextError } from "./helpers/requestHelpers";

interface Credentials {
  username: string;
  password: string;
}

function parseCredentials(body: unknown): Credentials {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;

  if (typeof data.username !== "string" || !data.username.trim()) {
    throw new Error("Username is required");
  }

  if (typeof data.password !== "string" || !data.password.trim()) {
    throw new Error("Password is required");
  }

  return {
    username: data.username.trim(),
    password: data.password,
  };
}

/**
 * Hashes a plaintext password using PBKDF2 with a random salt.
 */
export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");

  return { salt, hash };
}

/**
 * Verifies a plaintext password against a stored salt and hash.
 */
export function verifyPassword(
  password: string,
  salt: string,
  storedHash: string,
): boolean {
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");

  return hash === storedHash;
}

/**
 * GET /setup
 */
export async function setup_get(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const exists = await users.exists();

    if (exists) {
      res.redirect("/");
      return;
    }

    res.sendFile(path.resolve("client/dist/index.html"));
  } catch (error) {
    next(error);
  }
}

/**
 * POST /setup
 * Creates the initial admin user.
 */
export async function setup_post(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let credentials: Credentials;

  try {
    credentials = parseCredentials(req.body);
  } catch (error) {
    nextError(next, getErrorMessage(error) || "Invalid credentials", 400);
    return;
  }

  if (credentials.password.length < 8) {
    nextError(next, "Password must be at least 8 characters", 400);
    return;
  }

  try {
    const exists = await users.exists();

    if (exists) {
      nextError(next, "Setup already complete", 403);
      return;
    }

    const { username, password } = credentials;
    const { salt, hash } = hashPassword(password);

    const user = await users.create({
      username,
      passwordHash: hash,
      passwordSalt: salt,
    });

    const settings = await getSettings();

    // Log the user in immediately.
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
      },
      config.auth.jwtSecret,
      {
        expiresIn: settings.session.jwtLifetimeMinutes * 60,
      },
    );

    res.status(201).json({ token });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /apilogin
 * Authenticates against the DB user.
 */
export async function login_post(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let credentials: Credentials;

  try {
    credentials = parseCredentials(req.body);
  } catch {
    nextError(next, "Invalid username or password", 401);
    return;
  }

  try {
    const { username, password } = credentials;

    const user = await users.findByUsername(username);

    if (
      !user ||
      !verifyPassword(password, user.passwordSalt, user.passwordHash)
    ) {
      nextError(next, "Invalid username or password", 401);
      return;
    }

    const settings = await getSettings();

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
      },
      config.auth.jwtSecret,
      {
        expiresIn: settings.session.jwtLifetimeMinutes * 60,
      },
    );

    res.json({ token });
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware — redirects to /setup if no admin user exists yet.
 * Applied before all app routes so first-run is handled automatically.
 */
export async function requireSetupComplete(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (
    req.path === "/setup" ||
    req.path === "/apilogin" ||
    req.path.startsWith("/static/") ||
    req.path === "/favicon.ico" ||
    req.path === "/manifest.json"
  ) {
    next();
    return;
  }

  try {
    const exists = await users.exists();

    if (!exists) {
      if (req.accepts("html")) {
        res.redirect("/setup");
        return;
      }

      nextError(next, "Setup required", 428);
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}
