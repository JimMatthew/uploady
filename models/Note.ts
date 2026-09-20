import mongoose, { Schema } from "mongoose";

export interface NoteDocument {
  name: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<NoteDocument>(
  {
    name: {
      type: String,
      default: null,
    },
    content: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<NoteDocument>(
  "Note",
  noteSchema,
);