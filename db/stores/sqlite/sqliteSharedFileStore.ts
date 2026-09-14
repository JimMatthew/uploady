import {
  SharedFileStore,
  type CreateSharedFileInput,
  type SharedFile,
} from "../sharedFileStore";

import { getDatabase } from "../../sqlite/database";

interface SharedFileRow {
  id: string;
  file_name: string;
  file_path: string;
  link: string;
  token: string;
  is_remote: number;
  server_id: string | null;
  server_name: string | null;
  shared_at: string;
}

const toSharedFile = (
  row: SharedFileRow | null | undefined,
): SharedFile | null => {
  if (!row) {
    return null;
  }

  const base = {
    _id: String(row.id),
    fileName: row.file_name,
    filePath: row.file_path,
    link: row.link,
    token: row.token,
    sharedAt: new Date(row.shared_at),
  };

  if (Boolean(row.is_remote)) {
    if (!row.server_id || !row.server_name) {
      throw new Error(
        `Remote shared file ${row.id} is missing server information`,
      );
    }

    return {
      ...base,
      isRemote: true,
      serverId: row.server_id,
      serverName: row.server_name,
    };
  }

  return {
    ...base,
    isRemote: false,
  };
};

export class SqliteSharedFileStore extends SharedFileStore {

  async create(data: CreateSharedFileInput): Promise<SharedFile> {
    const db = getDatabase();

    const row = db.get(
      `
        INSERT INTO shared_files (
          file_name,
          file_path,
          link,
          token,
          is_remote,
          server_id,
          server_name
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `,
      data.fileName,
      data.filePath,
      data.link,
      data.token,
      data.isRemote ? 1 : 0,
      data.serverId ?? null,
      data.serverName ?? null,
    ) as SharedFileRow | undefined;

    const sharedFile = toSharedFile(row);

    if (!sharedFile) {
      throw new Error("Failed to create shared file");
    }

    return sharedFile;
  }

  async findByToken(token: string): Promise<SharedFile | null> {
    const db = getDatabase();

    const row = db.get(
      `
        SELECT *
        FROM shared_files
        WHERE token = ?
      `,
      token,
    ) as SharedFileRow | undefined;

    return toSharedFile(row);
  }

  async deleteByToken(token: string): Promise<SharedFile | null> {
    const db = getDatabase();

    const row = db.get(
      `
        DELETE FROM shared_files
        WHERE token = ?
        RETURNING *
      `,
      token,
    ) as SharedFileRow | undefined;

    return toSharedFile(row);
  }

  async deleteByPath(
    filePath: string,
    fileName: string,
  ): Promise<SharedFile | null> {
    const db = getDatabase();

    const row = db.get(
      `
        DELETE FROM shared_files
        WHERE file_path = ?
          AND file_name = ?
        RETURNING *
      `,
      filePath,
      fileName,
    ) as SharedFileRow | undefined;

    return toSharedFile(row);
  }

  async findByFile(
    fileName: string,
    filePath: string,
  ): Promise<SharedFile | null> {
    const db = getDatabase();

    const row = db.get(
      `
        SELECT *
        FROM shared_files
        WHERE file_name = ?
          AND file_path = ?
        LIMIT 1
      `,
      fileName,
      filePath,
    ) as SharedFileRow | undefined;

    return toSharedFile(row);
  }

  async list(): Promise<SharedFile[]> {
    const db = getDatabase();

    const rows = db.all(`
      SELECT *
      FROM shared_files
      ORDER BY shared_at DESC
    `);

    return rows
      .map((row) => toSharedFile(row as SharedFileRow))
      .filter((sharedFile): sharedFile is SharedFile => sharedFile !== null);
  }

  async findRemoteShare(
    fileName: string,
    filePath: string,
    serverId: string,
  ): Promise<SharedFile | null> {
    const db = getDatabase();

    const row = db.get(
      `
        SELECT *
        FROM shared_files
        WHERE file_name = ?
          AND file_path = ?
          AND server_id = ?
          AND is_remote = 1
        LIMIT 1
      `,
      fileName,
      filePath,
      serverId,
    ) as SharedFileRow | undefined;

    return toSharedFile(row);
  }
}
