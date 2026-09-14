export interface User {
  _id: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
}

export interface CreateUserInput {
  username: string;
  passwordHash: string;
  passwordSalt: string;
}

export abstract class UserStore {
  
  abstract exists(): Promise<boolean>;

  abstract create(data: CreateUserInput): Promise<User>;

  abstract findByUsername(username: string): Promise<User | null>;
}

module.exports = UserStore;
