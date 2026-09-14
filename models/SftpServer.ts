// ─── Schema ───────────────────────────────────────────────────────────────────

/**
 * Represents a saved SFTP server configuration.
 *
 * Password credentials are stored encrypted on the server record.
 * SSH key credentials are stored separately in the SSH key store and
 * referenced by keyId.
 *
 * Use getServerOptions() in serverService to retrieve decrypted
 * connection options.
 */
import mongoose, { Schema } from "mongoose";
import encryptedFieldSchema from "./encryptedField";

interface EncryptedField {
  iv: string;
  content: string;
  tag: string;
}

export interface SftpServerDocument {
  host: string;
  port: number;
  username: string;
  authType: "password" | "key";

  credentials: {
    password?: EncryptedField;
  };

  keyId?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const sftpServerSchema = new Schema<SftpServerDocument>(
  {
    host: {
      type: String,
      required: true,
    },

    port: {
      type: Number,
      default: 22,
    },

    username: {
      type: String,
      required: true,
    },

    authType: {
      type: String,
      enum: ["password", "key"],
      required: true,
      default: "password",
    },

    credentials: {
      password: {
        type: encryptedFieldSchema,
      },
    },

    keyId: {
      type: Schema.Types.ObjectId,
      ref: "SshKey",
      required: false,
    },
  },
  { timestamps: true },
);

const SftpServer = mongoose.model<SftpServerDocument>(
  "Server",
  sftpServerSchema,
);

export default SftpServer;
