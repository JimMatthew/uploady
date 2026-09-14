import {
  SshKeyStore,
  type CreateSshKeyInput,
  type SshKey,
  type UpdateSshKeyInput,
} from "../sshKeyStore";

const SshKeyModel = require("../../../models/SshKey");

export class MongoSshKeyStore extends SshKeyStore {
  async find(): Promise<SshKey[]> {
    return SshKeyModel.find();
  }

  async findShared(): Promise<SshKey[]> {
    return SshKeyModel.find({
      scope: "shared",
    });
  }

  async findById(id: string): Promise<SshKey | null> {
    return SshKeyModel.findById(id);
  }

  async findSharedById(id: string): Promise<SshKey | null> {
    return SshKeyModel.findOne({
      _id: id,
      scope: "shared",
    });
  }

  async create(data: CreateSshKeyInput): Promise<SshKey> {
    return SshKeyModel.create(data);
  }

  async findByIdAndUpdate(
    id: string,
    update: UpdateSshKeyInput,
  ): Promise<SshKey | null> {
    return SshKeyModel.findByIdAndUpdate(
      id,
      update,
      { new: true },
    );
  }

  async deleteById(id: string): Promise<SshKey | null> {
    return SshKeyModel.findByIdAndDelete(id);
  }
}