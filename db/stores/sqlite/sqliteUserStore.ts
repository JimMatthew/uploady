import { UserStore, type CreateUserInput, type User } from "../userStore";
import { getDatabase } from "../../sqlite/database";

interface UserRow {
  id: string | number;
  username: string;
  password_hash: string;
  password_salt: string;
}

const toUser = (row: UserRow | null | undefined): User | null => {
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

export class SqliteUserStore extends UserStore {
  async exists(): Promise<boolean> {
    const db = getDatabase();

    const row = db.get("SELECT 1 FROM users LIMIT 1");

    return row !== null;
  }

  async create(data: CreateUserInput): Promise<User> {
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

  async findByUsername(username: string): Promise<User | null> {
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
    ) as UserRow | undefined;

    return toUser(row);
  }
}
