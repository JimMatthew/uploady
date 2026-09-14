import mongoose, {
  Schema,
  type HydratedDocument,
} from "mongoose";

export interface UserDocumentShape {
  username: string;
  passwordHash: string;
  passwordSalt: string;
}

export type UserDocument =
  HydratedDocument<UserDocumentShape>;

const userSchema =
  new Schema<UserDocumentShape>({
    username: {
      type: String,
      required: true,
      unique: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    passwordSalt: {
      type: String,
      required: true,
    },
  });

const UserModel =
  mongoose.model<UserDocumentShape>(
    "User",
    userSchema,
  );

export default UserModel;