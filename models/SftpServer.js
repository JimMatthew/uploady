const mongoose = require("mongoose");
const encryptedFieldSchema = require("./encryptedField");

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
const sftpServerSchema = new mongoose.Schema(
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
      type: mongoose.Schema.Types.ObjectId,
      ref: "SshKey",
      required: false,
    },
  },
  { timestamps: true },
);

// ─── Model ────────────────────────────────────────────────────────────────────

const SftpServer = mongoose.model("Server", sftpServerSchema);

module.exports = SftpServer;
