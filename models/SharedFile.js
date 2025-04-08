const mongoose = require("mongoose");

const sharedFileSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  link: { type: String, required: true },
  token: { type: String, required: true },
  isRemote: {type: Boolean, required: false },
  serverId: { type: String, required: false }, 
  serverName: {type: String, required: false }, 
  sharedAt: { type: Date, default: Date.now },
});

const SharedFile = mongoose.model("SharedFiles", sharedFileSchema);

module.exports = SharedFile;
