import type { Request, Response, NextFunction } from "express";

/**
 * Sends an HTTP error response to the client.
 *
 * Logs the message to the server console and returns a JSON response
 * containing the error message.
 *
 * @param res - Express response object.
 * @param message - Error message to log and send to the client.
 * @param status - HTTP status code. Defaults to 500.
 */
export function handleError(
  res: Response,
  message: string,
  status = 500,
): void {
  console.error(message);

  res.status(status).json({
    error: message,
  });
}

/**
 * Converts an unknown thrown value into a readable error message.
 *
 * JavaScript allows anything to be thrown, so values caught in a
 * catch block should be treated as unknown. If the value is an Error,
 * its message is returned; otherwise the value is converted to a string.
 *
 * @param error - The unknown value caught or received as an error.
 * @returns A string suitable for logging or returning as an error message.
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Gets the wildcard portion of an Express route.
 *
 * For a route containing a wildcard such as `/files/*`, Express stores
 * the matched wildcard value in `req.params[0]`.
 *
 * Returns an empty string when no wildcard string is present.
 *
 * @param req - Express request object.
 * @returns The wildcard path, or an empty string if none was provided.
 */
export function getWildcardPath(req: Request): string {
  const value = req.params[0];

  return typeof value === "string" ? value : "";
}

/**
 * Gets a named route parameter as a non-empty string.
 *
 * Express route parameters come from `req.params`. This helper verifies
 * that the requested parameter exists and contains a non-empty string
 * before allowing the rest of the application to use it.
 *
 * @param req - Express request object.
 * @param name - Name of the route parameter to retrieve.
 * @returns The parameter value, or null if it is missing or empty.
 */
export function getStringParam(req: Request, name: string): string | null {
  const value = req.params[name];

  return typeof value === "string" && value ? value : null;
}

/**
 * Error shape passed to Express error-handling middleware.
 *
 * Keeps both the human-readable error message and the HTTP status
 * that should eventually be returned to the client.
 */
interface RequestError {
  message: string;
  status: number;
}

/**
 * Passes an HTTP-style error to the next Express error handler.
 *
 * Use this when the current controller should stop processing and let
 * centralized error-handling middleware create the final response.
 *
 * @param next - Express function used to continue to the next middleware.
 * @param message - Error message describing what went wrong.
 * @param status - HTTP status code associated with the error.
 */
export function nextError(
  next: NextFunction,
  message: string,
  status: number,
): void {
  const error: RequestError = {
    message,
    status,
  };

  next(error);
}
