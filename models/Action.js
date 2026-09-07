const mongoose = require("mongoose");

const actionSchema = new mongoose.Schema(
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
      type: mongoose.Schema.Types.ObjectId,
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

module.exports = mongoose.model("Action", actionSchema);
