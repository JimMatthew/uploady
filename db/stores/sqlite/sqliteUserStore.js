const UserStore = require("../userStore");
const { getDatabase } = require("../../sqlite/database");

const toUser = (row) => {
  if (!row) {
    return null;
  }

  return {
    _id: String(row.id),
    username: row.username,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
  };
};

class SqliteUserStore extends UserStore {
  async exists() {
    const db = getDatabase();

    const row = db.get(
      "SELECT 1 FROM users LIMIT 1",
    );

    return row !== null;
  }

  async create(data) {
    const db = getDatabase();

    const result = db.run(
      `
        INSERT INTO users (
          username,
          password_hash,
          password_salt
        )
        VALUES (?, ?, ?)
      `,
      data.username,
      data.passwordHash,
      data.passwordSalt,
    );

    return {
      _id: String(result.lastInsertRowid),
      username: data.username,
      passwordHash: data.passwordHash,
      passwordSalt: data.passwordSalt,
    };
  }

  async findByUsername(username) {
    const db = getDatabase();

    const row = db.get(
      `
        SELECT
          id,
          username,
          password_hash,
          password_salt
        FROM users
        WHERE username = ?
      `,
      username,
    );

    return toUser(row);
  }
}

module.exports = SqliteUserStore;