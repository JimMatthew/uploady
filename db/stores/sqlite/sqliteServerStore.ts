import crypto from "node:crypto";

import {
  ServerStore,
  CreateServerData,
  Server,
  ServerAuthType,
  ServerSummary,
  UpdateServerData,
  EncryptedField,
} from "../serverStore";

import { getDatabase } from "../../sqlite/database";

interface ServerRow {
  id: string;
  host: string;
  port: number;
  username: string;
  auth_type: ServerAuthType;
  password_iv: string | null;
  password_content: string | null;
  password_tag: string | null;
  key_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ServerSummaryRow {
  id: string;
  host: string;
}

interface ServerIdRow {
  id: string;
}

function getEncryptedPassword(row: ServerRow): EncryptedField | undefined {
  if (!row.password_iv || !row.password_content || !row.password_tag) {
    return undefined;
  }

  return {
    iv: row.password_iv,
    content: row.password_content,
    tag: row.password_tag,
  };
}

function toServer(row: ServerRow | null): Server | null {
  if (!row) {
    return null;
  }

  const base = {
    _id: String(row.id),
    host: row.host,
    port: row.port,
    username: row.username,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };

  if (row.auth_type === "password") {
    const password = getEncryptedPassword(row);

    if (!password) {
      throw new Error(`Password server ${row.id} has no encrypted password`);
    }

    return {
      ...base,
      authType: "password",
      credentials: {
        password,
      },

      // The DB may contain a key ID too. That's okay.
      keyId: row.key_id ?? undefined,
    };
  }

  if (!row.key_id) {
    throw new Error(`Key-authenticated server ${row.id} has no keyId`);
  }

  return {
    ...base,
    authType: "key",
    credentials: {
      // Preserve an existing password if the DB contains one,
      // even though keyId is the active authentication method.
      password: getEncryptedPassword(row),
    },
    keyId: row.key_id,
  };
}

export class SqliteServerStore extends ServerStore {
  async find(): Promise<Server[]> {
    const db = getDatabase();

    const rows = await db.all<ServerRow>(`
      SELECT *
      FROM servers
      ORDER BY host ASC
    `);

    return rows.map((row) => {
      const server = toServer(row);

      if (!server) {
        throw new Error(`Failed to map server row ${row.id}`);
      }

      return server;
    });
  }

  async listSummary(): Promise<ServerSummary[]> {
    const db = getDatabase();

    const rows = await db.all<ServerSummaryRow>(`
      SELECT
        id,
        host
      FROM servers
    `);

    return rows.map((row) => ({
      _id: String(row.id),
      host: row.host,
    }));
  }

  async findById(id: string): Promise<Server | null> {
    const db = getDatabase();

    const row = await db.get<ServerRow>(
      `
        SELECT *
        FROM servers
        WHERE id = ?
      `,
      id,
    );

    return toServer(row);
  }

  async create(data: CreateServerData): Promise<Server> {
    const db = getDatabase();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    let password: EncryptedField | undefined;
    let keyId: string | undefined;

    if (data.authType === "password") {
      password = data.credentials.password;
      keyId = data.keyId;
    } else {
      password = data.credentials?.password;
      keyId = data.keyId;
    }

    await db.run(
      `
        INSERT INTO servers (
          id,
          host,
          port,
          username,
          auth_type,
          password_iv,
          password_content,
          password_tag,
          key_id,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      id,
      data.host,
      data.port ?? 22,
      data.username,
      data.authType,
      password?.iv ?? null,
      password?.content ?? null,
      password?.tag ?? null,
      keyId ?? null,
      now,
      now,
    );

    const server = await this.findById(id);

    if (!server) {
      throw new Error("Failed to retrieve server after creation");
    }

    return server;
  }

  async findByIdAndUpdate(
    id: string,
    update: UpdateServerData,
  ): Promise<Server | null> {
    const existing = await this.findById(id);

    if (!existing) {
      return null;
    }

    const host = update.host ?? existing.host;
    const port = update.port ?? existing.port;
    const username = update.username ?? existing.username;
    const authType = update.authType ?? existing.authType;

    const existingPassword = existing.credentials.password;
    const password = update.credentials?.password ?? existingPassword;
    const keyId = update.keyId ?? existing.keyId;

    const db = getDatabase();

    await db.run(
      `
        UPDATE servers
        SET
          host = ?,
          port = ?,
          username = ?,
          auth_type = ?,
          password_iv = ?,
          password_content = ?,
          password_tag = ?,
          key_id = ?,
          updated_at = ?
        WHERE id = ?
      `,
      host,
      port,
      username,
      authType,
      password?.iv ?? null,
      password?.content ?? null,
      password?.tag ?? null,
      keyId ?? null,
      new Date().toISOString(),
      id,
    );

    return this.findById(id);
  }

  async deleteById(id: string): Promise<boolean> {
    const db = getDatabase();

    const row = await db.get<ServerIdRow>(
      `
        DELETE FROM servers
        WHERE id = ?
        RETURNING id
      `,
      id,
    );

    return row !== null;
  }

  async findSummariesByIds(ids: string[]): Promise<ServerSummary[]> {
    if (!ids.length) {
      return [];
    }

    const db = getDatabase();

    const placeholders = ids.map(() => "?").join(", ");

    const rows = await db.all<ServerSummaryRow>(
      `
        SELECT
          id,
          host
        FROM servers
        WHERE id IN (${placeholders})
      `,
      ...ids,
    );

    return rows.map((row) => ({
      _id: String(row.id),
      host: row.host,
    }));
  }
}
