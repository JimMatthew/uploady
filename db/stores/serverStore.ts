export interface EncryptedField {
  iv: string;
  content: string;
  tag: string;
}

interface ServerBase {
  _id: string;
  host: string;
  port: number;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PasswordServer extends ServerBase {
  authType: "password";
  credentials: {
    password: EncryptedField;
  };
  keyId?: string;
}

export interface KeyServer extends ServerBase {
  authType: "key";
  credentials: {
    password?: EncryptedField;
  };
  keyId: string;
}
export interface ServerCredentials {
  password?: EncryptedField;
}
export type Server = PasswordServer | KeyServer;

export type ServerAuthType = "password" | "key";

export interface ServerSummary {
  _id: string;
  host: string;
}

interface CreateServerBase {
  host: string;
  port?: number;
  username: string;
}

export interface CreatePasswordServerData
  extends CreateServerBase {
  authType: "password";
  credentials: {
    password: EncryptedField;
  };
  keyId?: string;
}

export interface CreateKeyServerData
  extends CreateServerBase {
  authType: "key";
  credentials?: {
    password?: EncryptedField;
  };
  keyId: string;
}

export type CreateServerData =
  | CreatePasswordServerData
  | CreateKeyServerData;

export type UpdateServerData = Partial<
  Omit<Server, "_id" | "createdAt" | "updatedAt">
>;

export abstract class ServerStore {
  abstract find(): Promise<Server[]>;

  abstract listSummary(): Promise<ServerSummary[]>;

  abstract findById(id: string): Promise<Server | null>;

  abstract create(data: CreateServerData): Promise<Server>;

  abstract findByIdAndUpdate(
    id: string,
    update: UpdateServerData,
  ): Promise<Server | null>;

  abstract deleteById(id: string): Promise<Server | null>;

  abstract findSummariesByIds(
    ids: string[],
  ): Promise<ServerSummary[]>;
}
