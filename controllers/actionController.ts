import type { Request, Response } from "express";

import {
  getAll as getAllActions,
  getById as getActionById,
  create as createAction,
  update as updateAction,
  delete as deleteActionService,
  execute as executeAction,
} from "../services/actionService";
import { CreateActionData } from "../db/stores/actionStore";

function getIdParam(req: Request, res: Response): string | null {
  const { id } = req.params;

  if (typeof id !== "string") {
    res.status(400).json({
      error: "Invalid action ID",
    });

    return null;
  }

  return id;
}

export async function getAll(_req: Request, res: Response): Promise<void> {
  try {
    const actions = await getAllActions();

    res.json(actions);
  } catch (error) {
    console.error("Failed to get actions:", error);

    res.status(500).json({
      error: "Failed to get actions",
    });
  }
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const id = getIdParam(req, res);

    if (!id) {
      return;
    }

    const action = await getActionById(id);

    if (!action) {
      res.status(404).json({
        error: "Action not found",
      });

      return;
    }

    res.json(action);
  } catch (error) {
    console.error("Failed to get action:", error);

    res.status(500).json({
      error: "Failed to get action",
    });
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
    ...(description !== undefined && { description }),
    serverId,
    command,
    ...(mode !== undefined && { mode }),
  };
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const data = parseCreateActionData(req.body);

    const action = await createAction(data);

    res.status(201).json(action);
  } catch (error) {
    console.error("Failed to create action:", error);

    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to create action",
    });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const id = getIdParam(req, res);

    if (!id) {
      return;
    }

    const action = await updateAction(id, req.body);

    if (!action) {
      res.status(404).json({
        error: "Action not found",
      });

      return;
    }

    res.json(action);
  } catch (error) {
    console.error("Failed to update action:", error);

    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to update action",
    });
  }
}

export async function deleteAction(req: Request, res: Response): Promise<void> {
  try {
    const id = getIdParam(req, res);

    if (!id) {
      return;
    }

    await deleteActionService(id);

    res.status(204).end();
  } catch (error) {
    console.error("Failed to delete action:", error);

    res.status(500).json({
      error: "Failed to delete action",
    });
  }
}

export async function run(req: Request, res: Response): Promise<void> {
  try {
    const id = getIdParam(req, res);

    if (!id) {
      return;
    }

    const result = await executeAction(id);

    res.json(result);
  } catch (error) {
    console.error("Failed to execute action:", error);

    res.status(400).json({
      error:
        error instanceof Error ? error.message : "Failed to execute action",
    });
  }
}
