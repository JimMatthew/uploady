export interface ServerSummary {
  _id: string;
  host: string;
}

export interface SftpServer extends ServerSummary {
  name?: string;
  hostname?: string;
  username?: string;
  authType?: "password" | "key";
  keyId?: string;
  publicKey?: string;
}

export type AuthMethod = "password" | "key";

export interface PasswordServerPayload {
  host: string;
  username: string;
  authType: "password";
  password: string;
}

export interface SavedKeyServerPayload {
  host: string;
  username: string;
  authType: "key";
  keyMode: "saved";
  keyId: string;
}

export interface ImportedKeyServerPayload {
  host: string;
  username: string;
  authType: "key";
  keyMode: "import";
  key: string;
  passphrase?: string;
}

export interface GeneratedKeyServerPayload {
  host: string;
  username: string;
  authType: "key";
  keyMode: "generate";
}

export type SaveServerPayload =
  | PasswordServerPayload
  | SavedKeyServerPayload
  | ImportedKeyServerPayload
  | GeneratedKeyServerPayload;

export interface SavedServer {
  id: string;
  host: string;
  username: string;
  authType: AuthMethod;
  keyId: string | null;
  publicKey: string | null;
}

export interface SaveServerResponse {
  message: string;
  server: SavedServer;
}

export type ServerStatus = "online" | "offline";

export type ServerStatuses =
  Record<string, ServerStatus>;
