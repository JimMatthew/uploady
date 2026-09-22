import jwt from "jsonwebtoken";

import type { NextFunction, Request, Response } from "express";
import { logger } from "../logging";

const log = logger.child("auth");

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    log.fatal("Required environment variable is not set", {
      variable: "JWT_SECRET",
    });

    process.exit(1);
  }

  return secret;
}

const JWT_SECRET = getJwtSecret();

/**
 * Authenticates requests via JWT.
 *
 * Accepts the token from:
 *   - Authorization: Bearer <token>
 *   - ?token=<token>
 *
 * Responds with:
 *   - 401 when no token is supplied
 *   - 403 when the token is invalid or expired
 */
export default function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  const headerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  const queryToken =
    typeof req.query.token === "string" ? req.query.token : undefined;

  const token = headerToken ?? queryToken;

  if (!token) {
    res.status(401).json({
      message: "Missing token",
    });

    return;
  }

  try {
    jwt.verify(token, JWT_SECRET);

    next();
  } catch {
    res.status(403).json({
      message: "Invalid or expired token",
    });
  }
}
