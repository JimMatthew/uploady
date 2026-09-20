export interface NoteResponse {
  _id: string;
  name: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteRequest {
  name?: string | null;
  content: string;
}

export interface CreateNoteResponse {
  note: NoteResponse;
}

export interface UpdateNoteRequest {
  name?: string | null;
  content?: string;
}

export interface UpdateNoteResponse {
  note: NoteResponse;
}

export interface GetNoteResponse {
  note: NoteResponse;
}

export interface ListNotesResponse {
  notes: NoteResponse[];
}

export interface DeleteNoteResponse {
  message: string;
}