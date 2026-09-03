const mongoose = require("mongoose");
const encryptedFieldSchema = require("./encryptedField");

// ─── Schema ───────────────────────────────────────────────────────────────────

/**
 * Represents a saved SFTP server configuration.
 * Credentials are stored encrypted — never in plaintext.
 * Use getServerOptions() in serverService to retrieve decrypted connection options.
 */
const sftpServerSchema = new mongoose.Schema(
  {
    host:     { type: String, required: true },
    port:     { type: Number, default: 22 },
    username: { type: String, required: true },
    authType: {
      type:     String,
      enum:     ["password", "key"],
      required: true,
      default:  "password",
    },
    credentials: {
      password:   { type: encryptedFieldSchema },
      privateKey: { type: encryptedFieldSchema },
      passphrase: { type: encryptedFieldSchema },
      publicKey:  { type: String, required: false }
    },
  },
  { timestamps: true },
);

// ─── Model ────────────────────────────────────────────────────────────────────

const SftpServer = mongoose.model("Server", sftpServerSchema);

module.exports = SftpServer;