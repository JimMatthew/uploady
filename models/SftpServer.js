const mongoose = require("mongoose");

const sftpServerSchema = new mongoose.Schema({
  host: { type: String, required: true },
  username: { type: String, required: true },
  authType: { 
    type: String, 
    enum: ["password", "key"], 
    required: true,
    default: "password"
  },
  credentials: {
    password: {
      iv: String,
      content: String,
      tag: String
    },
    privateKey: {
      iv: String,
      content: String,
      tag: String
    },
    passphrase: {
      iv: String,
      content: String,
      tag: String
    }
  }
}, { timestamps: true });

const SftpServer = mongoose.model("Server", sftpServerSchema);

module.exports = SftpServer;
