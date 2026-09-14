import mongoose, { Schema } from "mongoose";

export interface AppSettingsDocument {
  session: {
    jwtLifetimeMinutes: number;
  };
}

const appSettingsSchema = new Schema<AppSettingsDocument>(
  {
    session: {
      jwtLifetimeMinutes: {
        type: Number,
        default: 480,
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model<AppSettingsDocument>(
  "AppSettings",
  appSettingsSchema
);