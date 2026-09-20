export interface Note {
  _id: string;
  name: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNoteData {
  name?: string | null;
  content: string;
}

export interface UpdateNoteData {
  name?: string | null;
  content?: string;
}

export abstract class NoteStore {
  abstract getAll(): Promise<Note[]>;
  abstract getById(id: string): Promise<Note | null>;
  abstract create(data: CreateNoteData): Promise<Note>;
  abstract update(
    id: string,
    data: UpdateNoteData,
  ): Promise<Note | null>;
  abstract delete(id: string): Promise<boolean>;
}