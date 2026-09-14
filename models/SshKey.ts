import mongoose, { Schema, type HydratedDocument, type Types } from "mongoose";

import type { EncryptedField } from "../db/stores/sshKeyStore";

export interface SshKeyDocumentShape {
  name: string;
  scope: "server" | "shared";
  serverId?: Types.ObjectId;
  privateKey: EncryptedField;
  publicKey?: string;
  passphrase?: EncryptedField;

  createdAt: Date;
  updatedAt: Date;
}

export type SshKeyDocument = HydratedDocument<SshKeyDocumentShape>;

const encryptedFieldSchema = require("./encryptedField");

const sshKeySchema = new Schema<SshKeyDocumentShape>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    scope: {
      type: String,
      enum: ["server", "shared"],
      required: true,
      default: "server",
    },

    serverId: {
      type: Schema.Types.ObjectId,
      ref: "Server",
      required: false,
    },

    privateKey: {
      type: encryptedFieldSchema,
      required: true,
    },

    publicKey: {
      type: String,
      required: false,
    },

    passphrase: {
      type: encryptedFieldSchema,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

const SshKeyModel = mongoose.model<SshKeyDocumentShape>("SshKey", sshKeySchema);

export default SshKeyModel;
