const mongoose = require("mongoose");

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

/**
 * Shape of an AES-256-GCM encrypted value as stored in the database.
 * Matches the object returned by encrypt() in controllers/encryption.js.
 */
const encryptedFieldSchema = new mongoose.Schema(
  {
    iv:      { type: String, required: true },
    content: { type: String, required: true },
    tag:     { type: String, required: true },
  },
  { _id: false },
);

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
    },
  },
  { timestamps: true },
);

// ─── Model ────────────────────────────────────────────────────────────────────

const SftpServer = mongoose.model("Server", sftpServerSchema);

module.exports = SftpServer;