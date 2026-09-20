import { notes } from "../db";

import type {
  Note,
  CreateNoteData,
  UpdateNoteData,
} from "../db/stores/noteStore";

export async function getNotes(): Promise<Note[]> {
  return notes.getAll();
}

export async function getNote(id: string): Promise<Note | null> {
  return notes.getById(id);
}

export async function createNote(
  data: CreateNoteData,
): Promise<Note> {
  return notes.create(data);
}

export async function updateNote(
  id: string,
  data: UpdateNoteData,
): Promise<Note | null> {
  return notes.update(id, data);
}

export async function deleteNote(id: string): Promise<boolean> {
  return notes.delete(id);
}