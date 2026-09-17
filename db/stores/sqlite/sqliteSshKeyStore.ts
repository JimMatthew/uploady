import crypto from "node:crypto";

import {
  SshKeyStore,
  type CreateSshKeyInput,
  type SshKey,
  type UpdateSshKeyInput,
} from "../sshKeyStore";

import type { EncryptedField } from "../../../types/server";

import { getDatabase } from "../../sqlite/database";
import { propIfPresent } from "../../../shared/utils/PropHelper";

interface SshKeyRow {
  id: string;
  name: string;
  scope: "server" | "shared";
  server_id: string | null;

  private_key_iv: string;
  private_key_content: string;
  private_key_tag: string;

  public_key: string | null;

  passphrase_iv: string | null;
  passphrase_content: string | null;
  passphrase_tag: string | null;

  created_at: string;
  updated_at: string;
}

const toEncryptedField = (
  iv: string | null,
  content: string | null,
  tag: string | null,
): EncryptedField | undefined => {
  if (!iv || !content || !tag) {
    return undefined;
  }

  return {
    iv,
    content,
    tag,
  };
};

const toSshKey = (row: SshKeyRow | null): SshKey | null => {
  if (!row) {
    return null;
  }

  return {
    _id: String(row.id),
    name: row.name,
    scope: row.scope,
    ...propIfPresent("serverId", row.server_id),

    privateKey: {
      iv: row.private_key_iv,
      content: row.private_key_content,
      tag: row.private_key_tag,
    },

    ...propIfPresent("publicKey", row.public_key),

    ...propIfPresent(
      "passphrase",
      toEncryptedField(
        row.passphrase_iv,
        row.passphrase_content,
        row.passphrase_tag,
      ),
    ),

    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};

export class SqliteSshKeyStore extends SshKeyStore {
  async find(): Promise<SshKey[]> {
    const db = getDatabase();

    const rows = await db.all<SshKeyRow>(
      `
        SELECT *
        FROM ssh_keys
        ORDER BY created_at ASC
      `,
    );

    return rows.map((row) => {
      const key = toSshKey(row);

      if (!key) {
        throw new Error(`Failed to map SSH key row ${row.id}`);
      }

      return key;
    });
  }

  async findShared(): Promise<SshKey[]> {
    const db = getDatabase();

    const rows = await db.all<SshKeyRow>(
      `
        SELECT *
        FROM ssh_keys
        WHERE scope = 'shared'
        ORDER BY created_at ASC
      `,
    );

    return rows.map((row) => {
      const key = toSshKey(row);

      if (!key) {
        throw new Error(`Failed to map SSH key row ${row.id}`);
      }

      return key;
    });
  }

  async findById(id: string): Promise<SshKey | null> {
    const db = getDatabase();

    const row = await db.get<SshKeyRow>(
      `
        SELECT *
        FROM ssh_keys
        WHERE id = ?
      `,
      String(id),
    );

    return toSshKey(row);
  }

  async findSharedById(id: string): Promise<SshKey | null> {
    const db = getDatabase();

    const row = await db.get<SshKeyRow>(
      `
        SELECT *
        FROM ssh_keys
        WHERE id = ?
          AND scope = 'shared'
      `,
      String(id),
    );

    return toSshKey(row);
  }

  async create(data: CreateSshKeyInput): Promise<SshKey> {
    const db = getDatabase();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.run(
      `
        INSERT INTO ssh_keys (
          id,
          name,
          scope,
          server_id,
          private_key_iv,
          private_key_content,
          private_key_tag,
          public_key,
          passphrase_iv,
          passphrase_content,
          passphrase_tag,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      id,
      data.name,
      data.scope,
      data.serverId ?? null,

      data.privateKey.iv,
      data.privateKey.content,
      data.privateKey.tag,

      data.publicKey ?? null,

      data.passphrase?.iv ?? null,
      data.passphrase?.content ?? null,
      data.passphrase?.tag ?? null,

      now,
      now,
    );

    const created = await this.findById(id);

    if (!created) {
      throw new Error(`Failed to load newly created SSH key ${id}`);
    }

    return created;
  }

  async findByIdAndUpdate(
    id: string,
    update: UpdateSshKeyInput,
  ): Promise<SshKey | null> {
    const db = getDatabase();

    const existing = await this.findById(id);

    if (!existing) {
      return null;
    }

    const merged = {
      ...existing,
      ...update,
      privateKey: update.privateKey ?? existing.privateKey,
      passphrase:
        update.passphrase !== undefined
          ? update.passphrase
          : existing.passphrase,
    };

    await db.run(
      `
        UPDATE ssh_keys
        SET
          name = ?,
          scope = ?,
          server_id = ?,
          private_key_iv = ?,
          private_key_content = ?,
          private_key_tag = ?,
          public_key = ?,
          passphrase_iv = ?,
          passphrase_content = ?,
          passphrase_tag = ?,
          updated_at = ?
        WHERE id = ?
      `,
      merged.name,
      merged.scope,
      merged.serverId ?? null,

      merged.privateKey.iv,
      merged.privateKey.content,
      merged.privateKey.tag,

      merged.publicKey ?? null,

      merged.passphrase?.iv ?? null,
      merged.passphrase?.content ?? null,
      merged.passphrase?.tag ?? null,

      new Date().toISOString(),
      id,
    );

    return this.findById(id);
  }

  async deleteById(id: string): Promise<SshKey | null> {
    const db = getDatabase();

    const row = await db.get<SshKeyRow>(
      `
        DELETE FROM ssh_keys
        WHERE id = ?
        RETURNING *
      `,
      id,
    );

    return toSshKey(row);
  }
}