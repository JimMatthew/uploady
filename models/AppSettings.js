const mongoose = require("mongoose");

const appSettingsSchema = new mongoose.Schema(
  {
    session: {
      jwtLifetimeMinutes: {
        type: Number,
        default: 480,
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "AppSettings",
  appSettingsSchema,
);