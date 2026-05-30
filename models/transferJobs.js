const mongoose = require("mongoose");
const { JobStatus } = require("../controllers/jobs/jobConstants");

const transferJobSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: Object.values(JobStatus),
    required: true,
    default: JobStatus.QUEUED,
  },

  type: {type: String,default: "copy"},

  destServerId: { type: String, default: null },
  destPath: { type: String, required: true },
  currentFile: { type: String, default: null },

  totalFiles: { type: Number, default: 0 },
  completedFiles: { type: Number, default: 0 },
  failedFiles: {type: Number,default: 0},
  totalBytes: {type: Number,default: 0},
  transferredBytes: {type: Number,default: 0},

  error: {type: String,default: null},

  createdAt: {type: Date,default: Date.now},
  startedAt: Date,
  finishedAt: Date,
});

transferJobSchema.index({ createdAt: -1 });
transferJobSchema.index({ status: 1 });

const TransferJob = mongoose.model("TransferJob", transferJobSchema);

module.exports = TransferJob;