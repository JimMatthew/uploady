import {
  ServerStore,
  CreateServerData,
  Server,
  ServerSummary,
  UpdateServerData,
} from "../serverStore";

import SftpServer from "../../../models/SftpServer";

const toServer = (server: any): Server => ({
  _id: String(server._id),
  host: server.host,
  port: server.port,
  username: server.username,
  authType: server.authType,
  credentials: server.credentials ?? {},
  keyId: server.keyId != null ? String(server.keyId) : undefined,
  createdAt: server.createdAt,
  updatedAt: server.updatedAt,
});

export class MongoServerStore extends ServerStore {
  async find(): Promise<Server[]> {
    const servers = await SftpServer.find().lean();

    return servers.map(toServer);
  }

  async listSummary(): Promise<ServerSummary[]> {
    const servers = await SftpServer.find().select("_id host").lean();

    return servers.map((server) => ({
      _id: String(server._id),
      host: server.host,
    }));
  }

  async findById(id: string): Promise<Server | null> {
    const server = await SftpServer.findById(id).lean();

    return server ? toServer(server) : null;
  }

  async create(data: CreateServerData): Promise<Server> {
    const server = await SftpServer.create(data);

    return toServer(server.toObject());
  }

  async findByIdAndUpdate(
    id: string,
    update: UpdateServerData,
  ): Promise<Server | null> {
    const server = await SftpServer.findByIdAndUpdate(id, update, {
      new: true,
    }).lean();

    return server ? toServer(server) : null;
  }

  async deleteById(id: string): Promise<boolean> {
  const result = await SftpServer.findByIdAndDelete(id)
    .select("_id")
    .lean();

  return result !== null;
}

  async findSummariesByIds(ids: string[]): Promise<ServerSummary[]> {
    if (!ids.length) {
      return [];
    }

    const servers = await SftpServer.find({
      _id: { $in: ids },
    })
      .select("_id host")
      .lean();

    return servers.map((server) => ({
      _id: String(server._id),
      host: server.host,
    }));
  }
}
