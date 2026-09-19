import type { Request, Response, NextFunction } from "express";

export function handleError(res: Response, message: string, status = 500): void {
  console.error(message);

  res.status(status).json({
    error: message,
  });
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function getWildcardPath(req: Request): string {
  const value = req.params[0];

  return typeof value === "string" ? value : "";
}

export function getStringParam(req: Request, name: string): string | null {
  const value = req.params[name];

  return typeof value === "string" && value ? value : null;
}
interface RequestError {
  message: string;
  status: number;
}
export function nextError(next: NextFunction, message: string, status: number): void {
  const error: RequestError = {
    message,
    status,
  };

  next(error);
}