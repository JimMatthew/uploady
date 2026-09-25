import type { NextFunction, Request, Response } from "express";

import {
  getAll as getAllActions,
  getById as getActionById,
  create as createAction,
  update as updateAction,
  delete as deleteActionService,
  execute as executeAction,
} from "../services/actionService";

import type { CreateActionData } from "../db/stores/actionStore";

import {
  getStringParam,
  getErrorMessage,
  nextError,
} from "./helpers/requestHelpers";
import { propIfPresent } from "../shared/utils/PropHelper";

export async function getAll(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const actions = await getAllActions();

    res.json(actions);
  } catch (error) {
    next(error);
  }
}

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const id = getStringParam(req, "id");

  if (!id) {
    nextError(next, "Invalid action ID", 400);
    return;
  }

  try {
    const action = await getActionById(id);

    if (!action) {
      nextError(next, "Action not found", 404);
      return;
    }

    res.json(action);
  } catch (error) {
    next(error);
  }
}

function parseCreateActionData(body: unknown): CreateActionData {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Invalid request body");
  }

  const { name, description, serverId, command, mode } = body as Record<
    string,
    unknown
  >;

  if (typeof name !== "string" || !name.trim()) {
    throw new Error("Action name is required");
  }

  if (description !== undefined && typeof description !== "string") {
    throw new Error("Action description must be a string");
  }

  if (typeof serverId !== "string" || !serverId.trim()) {
    throw new Error("Server ID is required");
  }

  if (typeof command !== "string" || !command.trim()) {
    throw new Error("Action command is required");
  }

  if (mode !== undefined && mode !== "capture" && mode !== "terminal") {
    throw new Error("Invalid action mode");
  }

  return {
    name,
    ...propIfPresent("description", description),
    serverId,
    command,
    ...(mode !== undefined && { mode }),
  };
}

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let data: CreateActionData;

  try {
    data = parseCreateActionData(req.body);
  } catch (error) {
    nextError(next, getErrorMessage(error) || "Invalid request body", 400);
    return;
  }

  try {
    const action = await createAction(data);

    res.status(201).json(action);
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const id = getStringParam(req, "id");

  if (!id) {
    nextError(next, "Invalid action ID", 400);
    return;
  }

  try {
    const action = await updateAction(id, req.body);

    if (!action) {
      nextError(next, "Action not found", 404);
      return;
    }

    res.json(action);
  } catch (error) {
    next(error);
  }
}

export async function deleteAction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const id = getStringParam(req, "id");

  if (!id) {
    nextError(next, "Invalid action ID", 400);
    return;
  }

  try {
    await deleteActionService(id);

    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function run(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const id = getStringParam(req, "id");

  if (!id) {
    nextError(next, "Invalid action ID", 400);
    return;
  }

  try {
    const result = await executeAction(id);

    res.json(result);
  } catch (error) {
    next(error);
  }
}
