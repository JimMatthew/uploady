const mongoose = require("mongoose");
const { ItemStatus, ItemKind } = require("../controllers/jobs/jobConstants");

const transferJobItemSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },

  sourceType: {
    type: String,
    enum: ["local", "sftp", "archive"],
    default: "local",
  },

  sourceServerId: { type: String, default: null },

  archivePath: {
    type: String,
    default: null,
  },

  filename: { type: String, required: true },

  sourcePath: String,
  destinationPath: String,

  kind: {
    type: String,
    enum: Object.values(ItemKind),
    default: ItemKind.FILE,
  },

  status: {
    type: String,
    enum: Object.values(ItemStatus),
    default: ItemStatus.PENDING,
  },

  rootItem: { type: String, required: true },

  size: { type: Number, default: 0 },
  bytesTransferred: { type: Number, default: 0 },

  startedAt: Date,
  completedAt: Date,
  error: String,
});

//transferItemSchema.index({ jobId: 1 });
//transferItemSchema.index({ jobId: 1, status: 1 });

const TransferItem = mongoose.model("TransferItem", transferJobItemSchema);

module.exports = TransferItem;
