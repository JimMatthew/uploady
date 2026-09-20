import type { ServerSummary } from "../../db/stores/serverStore";

// -----------------------------------------------------------------------------
// Server authentication
// -----------------------------------------------------------------------------

export type ServerAuthType = "password" | "key";

export type KeyMode = "saved" | "generate" | "import";

// -----------------------------------------------------------------------------
// Save server
// -----------------------------------------------------------------------------

interface SaveServerBase {
  host: string;
  username: string;
}

export interface PasswordServerRequest extends SaveServerBase {
  authType: "password";
  password: string;
}

export interface SavedKeyServerRequest extends SaveServerBase {
  authType: "key";
  keyMode: "saved";
  keyId: string;
}

export interface ImportedKeyServerRequest extends SaveServerBase {
  authType: "key";
  keyMode: "import";
  key: string;
  passphrase?: string;
}

export interface GeneratedKeyServerRequest extends SaveServerBase {
  authType: "key";
  keyMode: "generate";
}

export type SaveServerRequest =
  | PasswordServerRequest
  | SavedKeyServerRequest
  | ImportedKeyServerRequest
  | GeneratedKeyServerRequest;

export interface SavedServerResponse {
  id: string;
  host: string;
  username: string;
  authType: ServerAuthType;
  keyId: string | null;
  publicKey: string | null;
}

export interface SaveServerResponse {
  message: string;
  server: SavedServerResponse;
}
// -----------------------------------------------------------------------------
// List servers
// -----------------------------------------------------------------------------

export interface ListServersResponse {
  servers: ServerSummary[];
}

// -----------------------------------------------------------------------------
// Server status
// -----------------------------------------------------------------------------

export type ServerStatus = "online" | "offline";

export interface ServerStatusResponse {
  status: ServerStatus;
}

// -----------------------------------------------------------------------------
// Delete server
// -----------------------------------------------------------------------------

export interface DeleteServerRequest {
  serverId: string;
}

export interface DeleteServerResponse {
  message: string;
}

// -----------------------------------------------------------------------------
// Server public key
// -----------------------------------------------------------------------------

export interface ServerPublicKeyResponse {
  publicKey: string;
}