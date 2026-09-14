import {
  SshKeyStore,
  type CreateSshKeyInput,
  type SshKey,
  type UpdateSshKeyInput,
} from "../sshKeyStore";

import SshKeyModel, { type SshKeyDocument } from "../../../models/SshKey";
import { propIfPresent } from "../../../shared/utils/PropHelper";

const toSshKey = (doc: SshKeyDocument | null | undefined): SshKey | null => {
  if (!doc) {
    return null;
  }

  return {
    _id: doc._id.toString(),
    name: doc.name,
    scope: doc.scope,
    ...propIfPresent("serverId", doc.serverId?.toString()),
    privateKey: doc.privateKey,
    ...propIfPresent("publicKey", doc.publicKey),
    ...propIfPresent("passphrase", doc.passphrase),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

export class MongoSshKeyStore extends SshKeyStore {
  async find(): Promise<SshKey[]> {
    const docs = await SshKeyModel.find();

    return docs.map((doc) => toSshKey(doc)!);
  }

  async findShared(): Promise<SshKey[]> {
    const docs = await SshKeyModel.find({
      scope: "shared",
    });

    return docs.map((doc) => toSshKey(doc)!);
  }

  async findById(id: string): Promise<SshKey | null> {
    return toSshKey(await SshKeyModel.findById(id));
  }

  async findSharedById(id: string): Promise<SshKey | null> {
    return toSshKey(
      await SshKeyModel.findOne({
        _id: id,
        scope: "shared",
      }),
    );
  }

  async create(data: CreateSshKeyInput): Promise<SshKey> {
    const doc = await SshKeyModel.create(data);

    const key = toSshKey(doc);

    if (!key) {
      throw new Error("Failed to create SSH key");
    }

    return key;
  }

  async findByIdAndUpdate(
    id: string,
    update: UpdateSshKeyInput,
  ): Promise<SshKey | null> {
    return toSshKey(
      await SshKeyModel.findByIdAndUpdate(id, update, { new: true }),
    );
  }

  async deleteById(id: string): Promise<SshKey | null> {
    return toSshKey(await SshKeyModel.findByIdAndDelete(id));
  }
}
