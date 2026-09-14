import {
  SharedFileStore,
  type CreateSharedFileInput,
  type SharedFile,
} from "../sharedFileStore";

import SharedFileModel, {
  type SharedFileDocument,
} from "../../../models/SharedFile";

const toSharedFile = (
  doc: SharedFileDocument | null | undefined,
): SharedFile | null => {
  if (!doc) {
    return null;
  }

  const base = {
    _id: doc._id.toString(),
    fileName: doc.fileName,
    filePath: doc.filePath,
    link: doc.link,
    token: doc.token,
    sharedAt: doc.sharedAt,
  };

  if (doc.isRemote) {
    if (!doc.serverId || !doc.serverName) {
      throw new Error(
        `Remote shared file ${doc._id} is missing server information`,
      );
    }

    return {
      ...base,
      isRemote: true,
      serverId: doc.serverId,
      serverName: doc.serverName,
    };
  }

  return {
    ...base,
    isRemote: false,
  };
};

export class MongoSharedFileStore extends SharedFileStore {
  async create(data: CreateSharedFileInput): Promise<SharedFile> {
    const doc = await SharedFileModel.create(data);

    const sharedFile = toSharedFile(doc);

    if (!sharedFile) {
      throw new Error("Failed to create shared file");
    }

    return sharedFile;
  }

  async findByToken(token: string): Promise<SharedFile | null> {
    const doc = await SharedFileModel.findOne({ token });

    return toSharedFile(doc);
  }

  async deleteByToken(token: string): Promise<SharedFile | null> {
    const doc = await SharedFileModel.findOneAndDelete({
      token,
    });

    return toSharedFile(doc);
  }

  async deleteByPath(
    filePath: string,
    fileName: string,
  ): Promise<SharedFile | null> {
    const doc = await SharedFileModel.findOneAndDelete({
      filePath,
      fileName,
    });

    return toSharedFile(doc);
  }

  async findByFile(
    fileName: string,
    filePath: string,
  ): Promise<SharedFile | null> {
    const doc = await SharedFileModel.findOne({
      fileName,
      filePath,
    });

    return toSharedFile(doc);
  }

  async list(): Promise<SharedFile[]> {
    const docs = await SharedFileModel.find().sort({ sharedAt: -1 });

    return docs.map((doc) => toSharedFile(doc)!);
  }

  async findRemoteShare(
    fileName: string,
    filePath: string,
    serverId: string,
  ): Promise<SharedFile | null> {
    const doc = await SharedFileModel.findOne({
      fileName,
      filePath,
      serverId,
      isRemote: true,
    });

    return toSharedFile(doc);
  }
}
