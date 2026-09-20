import {
  NoteStore,
  Note,
  CreateNoteData,
  UpdateNoteData,
} from "../noteStore";

import NoteModel from "../../../models/Note";

export class MongoNoteStore extends NoteStore {
  async getAll(): Promise<Note[]> {
    return NoteModel.find()
      .sort({ updatedAt: -1 })
      .lean<Note[]>();
  }

  async getById(id: string): Promise<Note | null> {
    return NoteModel.findById(id).lean<Note>();
  }

  async create(data: CreateNoteData): Promise<Note> {
    const note = await NoteModel.create({
      name: data.name ?? null,
      content: data.content,
    });

    return note.toObject<Note>();
  }

  async update(
    id: string,
    data: UpdateNoteData,
  ): Promise<Note | null> {
    const $set: Record<string, unknown> = {};

    if (data.name !== undefined) {
      $set.name = data.name;
    }

    if (data.content !== undefined) {
      $set.content = data.content;
    }

    return NoteModel.findByIdAndUpdate(
      id,
      { $set },
      {
        new: true,
        runValidators: true,
      },
    ).lean<Note>();
  }

  async delete(id: string): Promise<boolean> {
    const result = await NoteModel.deleteOne({
      _id: id,
    });

    return result.deletedCount > 0;
  }
}