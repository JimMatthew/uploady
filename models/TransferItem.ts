import mongoose, {
  Schema,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";

import {
  ItemStatus,
  ItemKind,
  type ItemStatus as ItemStatusType,
  type ItemKind as ItemKindType,
} from "../controllers/jobs/jobConstants";

import type { TransferSourceType } from "../db/stores/transferItemStore";

export interface TransferItemDocument {
  jobId: Types.ObjectId;

  sourceType: TransferSourceType;
  sourceServerId: string | null;

  archivePath: string | null;

  filename: string;

  sourcePath?: string;
  destinationPath?: string;

  kind: ItemKindType;
  status: ItemStatusType;

  rootItem: string;

  size: number;
  bytesTransferred: number;

  startedAt?: Date;
  completedAt?: Date;

  error?: string;
}

export type TransferItemHydratedDocument =
  HydratedDocument<TransferItemDocument>;

const transferJobItemSchema = new Schema<TransferItemDocument>({
  jobId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },

  sourceType: {
    type: String,
    enum: ["local", "sftp", "archive"],
    default: "local",
  },

  sourceServerId: {
    type: String,
    default: null,
  },

  archivePath: {
    type: String,
    default: null,
  },

  filename: {
    type: String,
    required: true,
  },

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

  rootItem: {
    type: String,
    required: true,
  },

  size: {
    type: Number,
    default: 0,
  },

  bytesTransferred: {
    type: Number,
    default: 0,
  },

  startedAt: Date,

  completedAt: Date,

  error: String,
});

const TransferItemModel: Model<TransferItemDocument> =
  mongoose.model<TransferItemDocument>("TransferItem", transferJobItemSchema);

export default TransferItemModel;
