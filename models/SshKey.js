const mongoose = require("mongoose");
const encryptedFieldSchema = require("./encryptedField");

const sshKeySchema = new mongoose.Schema(
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
      type: mongoose.Schema.Types.ObjectId,
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
  { timestamps: true },
);

module.exports = mongoose.model("SshKey", sshKeySchema);