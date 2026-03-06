const mongoose = require("mongoose");

/**
 * Represents a publicly shareable link to a file.
 * Files can be local (served from disk) or remote (streamed from an SFTP server).
 * Access is controlled by the token — no authentication is required to use a share link.
 * Use token as the lookup key when serving shared files.
 */
const sharedFileSchema = new mongoose.Schema({
  fileName:   { type: String, required: true },
  filePath:   { type: String, required: true, index: true },
  link:       { type: String, required: true },
  token:      { type: String, required: true, unique: true, index: true },
  isRemote:   { type: Boolean },
  serverId:   { type: String },
  serverName: { type: String },
  sharedAt:   { type: Date, default: Date.now },
});

const SharedFile = mongoose.model("SharedFiles", sharedFileSchema);

module.exports = SharedFile;
