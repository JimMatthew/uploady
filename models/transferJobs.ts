import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

import {
  JobStatus,
  type JobStatus as JobStatusType,
} from "../controllers/jobs/jobConstants";

export interface TransferJobDocument {
  status: JobStatusType;

  type: string;

  destServerId: string | null;
  destPath: string;

  currentFile: string | null;

  totalFiles: number;
  completedFiles: number;
  failedFiles: number;

  totalBytes: number;
  transferredBytes: number;

  error: string | null;

  createdAt: Date;

  startedAt?: Date;
  finishedAt?: Date;
}

export type TransferJobHydratedDocument = HydratedDocument<TransferJobDocument>;

const transferJobSchema = new Schema<TransferJobDocument>({
  status: {
    type: String,
    enum: Object.values(JobStatus),

    required: true,

    default: JobStatus.QUEUED,
  },

  type: {
    type: String,
    default: "copy",
  },

  destServerId: {
    type: String,
    default: null,
  },

  destPath: {
    type: String,
    required: true,
  },

  currentFile: {
    type: String,
    default: null,
  },

  totalFiles: {
    type: Number,
    default: 0,
  },

  completedFiles: {
    type: Number,
    default: 0,
  },

  failedFiles: {
    type: Number,
    default: 0,
  },

  totalBytes: {
    type: Number,
    default: 0,
  },

  transferredBytes: {
    type: Number,
    default: 0,
  },

  error: {
    type: String,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  startedAt: Date,

  finishedAt: Date,
});

transferJobSchema.index({
  createdAt: -1,
});

transferJobSchema.index({
  status: 1,
});

const TransferJobModel: Model<TransferJobDocument> =
  mongoose.model<TransferJobDocument>("TransferJob", transferJobSchema);

export default TransferJobModel;
