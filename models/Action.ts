import mongoose, { Schema } from "mongoose";

export interface ActionDocument {
  name: string;
  description: string;
  serverId: mongoose.Types.ObjectId;
  command: string;
  mode: "capture" | "terminal";
  createdAt: Date;
  updatedAt: Date;
}

const actionSchema = new Schema<ActionDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    serverId: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    command: {
      type: String,
      required: true,
    },

    mode: {
      type: String,
      enum: ["capture", "terminal"],
      required: true,
      default: "capture",
    },
  },
  {
    timestamps: true,
  },
);

const ActionModel = mongoose.model<ActionDocument>("Action", actionSchema);

export default ActionModel;
