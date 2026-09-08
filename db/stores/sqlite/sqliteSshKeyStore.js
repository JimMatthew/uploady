const SshKeyStore = require("../sshKeyStore");
const { getDatabase } = require("../../sqlite/database");
const crypto = require("crypto");

const toEncryptedField = (iv, content, tag) => {
  if (!iv || !content || !tag) {
    return undefined;
  }

  return {
    iv,
    content,
    tag,
  };
};

const toSshKey = (row) => {
  if (!row) {
    return null;
  }

  return {
    _id: String(row.id),
    name: row.name,
    scope: row.scope,
    serverId: row.server_id ?? undefined,

    privateKey: {
      iv: row.private_key_iv,
      content: row.private_key_content,
      tag: row.private_key_tag,
    },

    publicKey: row.public_key ?? undefined,

    passphrase: toEncryptedField(
      row.passphrase_iv,
      row.passphrase_content,
      row.passphrase_tag,
    ),

    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};

class SqliteSshKeyStore extends SshKeyStore {
  async find() {
    const db = getDatabase();

    return db
      .all(
        `
        SELECT *
        FROM ssh_keys
        ORDER BY created_at ASC
      `,
      )
      .map(toSshKey);
  }

  async findShared() {
    const db = getDatabase();

    return db
      .all(
        `
        SELECT *
        FROM ssh_keys
        WHERE scope = 'shared'
        ORDER BY created_at ASC
      `,
      )
      .map(toSshKey);
  }

  async findById(id) {
    const db = getDatabase();

    const normalizedId = String(id);

    return toSshKey(
      db.get(
        `
        SELECT *
        FROM ssh_keys
        WHERE id = ?
      `,
        normalizedId,
      ),
    );
  }

  async findSharedById(id) {
    const db = getDatabase();

    return toSshKey(
      db.get(
        `
        SELECT *
        FROM ssh_keys
        WHERE id = ?
          AND scope = 'shared'
      `,
        String(id),
      ),
    );
  }

  async create(data) {
    const db = getDatabase();

    // Mongo previously generated IDs for you.
    // Generate an application-side ID for new SQLite records.
    const id = crypto.randomUUID();

    const now = new Date().toISOString();

    db.run(
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

    return this.findById(id);
  }

  async findByIdAndUpdate(id, update) {
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

    db.run(
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

  async deleteById(id) {
    const db = getDatabase();

    return toSshKey(
      db.get(
        `
          DELETE FROM ssh_keys
          WHERE id = ?
          RETURNING *
        `,
        id,
      ),
    );
  }
}

module.exports = SqliteSshKeyStore;
