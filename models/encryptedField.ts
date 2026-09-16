import { Schema } from "mongoose";

export interface EncryptedField {
  iv: string;
  content: string;
  tag: string;
}

const encryptedFieldSchema = new Schema<EncryptedField>(
  {
    iv: {
      type: String,
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    tag: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  },
);

export default encryptedFieldSchema;
