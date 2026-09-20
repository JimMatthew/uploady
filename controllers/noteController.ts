import type { Request, Response, NextFunction } from "express";

import {
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
} from "../services/noteService";

import type {
  NoteResponse,
  ListNotesResponse,
  GetNoteResponse,
  CreateNoteRequest,
  CreateNoteResponse,
  UpdateNoteRequest,
  UpdateNoteResponse,
  DeleteNoteResponse,
} from "../shared/api/notes";

import type { Note } from "../db/stores/noteStore";

import { nextError } from "./helpers/requestHelpers";

function toNoteResponse(note: Note): NoteResponse {
  return {
    _id: note._id,
    name: note.name,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

function parseCreateNoteRequest(body: unknown): CreateNoteRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;

  if (typeof data.content !== "string") {
    throw new Error("Missing or invalid content");
  }

  if (
    data.name !== undefined &&
    data.name !== null &&
    typeof data.name !== "string"
  ) {
    throw new Error("Invalid note name");
  }

  return {
    content: data.content,
    ...(data.name !== undefined && {
      name: data.name as string | null,
    }),
  };
}

function parseUpdateNoteRequest(body: unknown): UpdateNoteRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;

  if (
    data.name !== undefined &&
    data.name !== null &&
    typeof data.name !== "string"
  ) {
    throw new Error("Invalid note name");
  }

  if (data.content !== undefined && typeof data.content !== "string") {
    throw new Error("Invalid note content");
  }

  if (data.name === undefined && data.content === undefined) {
    throw new Error("No note fields provided");
  }

  const request: UpdateNoteRequest = {};

  if (data.name !== undefined) {
    request.name = data.name as string | null;
  }

  if (data.content !== undefined) {
    request.content = data.content;
  }

  return request;
}

export async function notes_get(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const notes = await getNotes();

    const response: ListNotesResponse = {
      notes: notes.map(toNoteResponse),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Get notes error:", error);

    nextError(next, "Error getting notes", 500);
  }
}

export async function note_get(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    nextError(next, "Missing or invalid note ID", 400);
    return;
  }

  try {
    const note = await getNote(id);

    if (!note) {
      nextError(next, "Note not found", 404);
      return;
    }

    const response: GetNoteResponse = {
      note: toNoteResponse(note),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Get note error:", error);

    nextError(next, "Error getting note", 500);
  }
}

export async function note_create_post(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let request: CreateNoteRequest;

  try {
    request = parseCreateNoteRequest(req.body);
  } catch (error) {
    nextError(
      next,
      error instanceof Error ? error.message : "Invalid request body",
      400,
    );
    return;
  }

  try {
    const note = await createNote(request);

    const response: CreateNoteResponse = {
      note: toNoteResponse(note),
    };

    res.status(201).json(response);
  } catch (error) {
    console.error("Create note error:", error);

    nextError(next, "Error creating note", 500);
  }
}

export async function note_update_post(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    nextError(next, "Missing or invalid note ID", 400);
    return;
  }

  let request: UpdateNoteRequest;

  try {
    request = parseUpdateNoteRequest(req.body);
  } catch (error) {
    nextError(
      next,
      error instanceof Error ? error.message : "Invalid request body",
      400,
    );
    return;
  }

  try {
    const note = await updateNote(id, request);

    if (!note) {
      nextError(next, "Note not found", 404);
      return;
    }

    const response: UpdateNoteResponse = {
      note: toNoteResponse(note),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Update note error:", error);

    nextError(next, "Error updating note", 500);
  }
}

export async function note_delete(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    nextError(next, "Missing or invalid note ID", 400);
    return;
  }

  try {
    const deleted = await deleteNote(id);

    if (!deleted) {
      nextError(next, "Note not found", 404);
      return;
    }

    const response: DeleteNoteResponse = {
      message: "Note deleted",
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Delete note error:", error);

    nextError(next, "Error deleting note", 500);
  }
}
