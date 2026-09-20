/**
 * Serialized authenticated-encryption payload stored in persistence.
 *
 * Contains the encrypted content together with the IV and authentication tag
 * required to decrypt and verify it.
 */
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

/**
 * Canonical persisted server representation.
 *
 * Password-authenticated servers contain encrypted password credentials.
 * Key-authenticated servers always have a keyId identifying their SSH key.
 */
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

/**
 * Persistence contract for configured servers.
 *
 * Store implementations are responsible for translating their database-specific
 * representation into the canonical Server types exposed to the application.
 * Authentication invariants are represented by the Server discriminated union.
 */
export abstract class ServerStore {
  /** Returns all configured servers. */
  abstract find(): Promise<Server[]>;

  /**
   * Returns lightweight server records for callers that only need identity
   * and display information.
   */
  abstract listSummary(): Promise<ServerSummary[]>;

  /** Returns a server by ID, or null when it does not exist. */
  abstract findById(id: string): Promise<Server | null>;

  /**
   * Persists a new server and returns its canonical stored representation.
   */
  abstract create(data: CreateServerData): Promise<Server>;

  /**
   * Updates a server and returns the updated representation, or null when
   * the server does not exist.
   */
  abstract findByIdAndUpdate(
    id: string,
    update: UpdateServerData,
  ): Promise<Server | null>;

  /**
   * Deletes a server by ID.
   *
   * Returns true when a server was deleted and false when no matching
   * server existed.
   */
  abstract deleteById(id: string): Promise<boolean>;

  /**
   * Returns lightweight records for the requested server IDs.
   *
   * IDs that do not correspond to an existing server are omitted.
   */
  abstract findSummariesByIds(
    ids: string[],
  ): Promise<ServerSummary[]>;
}