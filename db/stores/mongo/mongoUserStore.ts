import { UserStore, type CreateUserInput, type User } from "../userStore";
import UserModel, { type UserDocument } from "../../../models/User";

const toUser = (doc: UserDocument | null | undefined): User | null => {
  if (!doc) {
    return null;
  }

  return {
    _id: doc._id.toString(),
    username: doc.username,
    passwordHash: doc.passwordHash,
    passwordSalt: doc.passwordSalt,
  };
};

export class MongoUserStore extends UserStore {
  async exists(): Promise<boolean> {
    return (await UserModel.exists({})) !== null;
  }

  async create(data: CreateUserInput): Promise<User> {
    const doc = await UserModel.create(data);

    const user = toUser(doc);

    if (!user) {
      throw new Error("Failed to create user");
    }

    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    const doc = await UserModel.findOne({
      username,
    });

    return toUser(doc);
  }
}
