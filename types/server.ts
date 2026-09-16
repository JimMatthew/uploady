import { ServerAuthType } from "../db/stores/serverStore";

export interface EncryptedField {
  iv: string;
  content: string;
  tag: string;
}


export type KeyMode = "saved" | "generate" | "import";

interface SaveServerBase {
  host: string;
  username: string;
}

interface PasswordServerOptions extends SaveServerBase {
  authType: "password";
  password: string;
}

interface SavedKeyServerOptions extends SaveServerBase {
  authType: "key";
  keyMode: "saved";
  keyId: string;
}

interface GeneratedKeyServerOptions extends SaveServerBase {
  authType: "key";
  keyMode: "generate";
}

interface ImportedKeyServerOptions extends SaveServerBase {
  authType: "key";
  keyMode: "import";
  key: string;
  passphrase?: string;
}

export type SaveServerOptions =
  | PasswordServerOptions
  | SavedKeyServerOptions
  | GeneratedKeyServerOptions
  | ImportedKeyServerOptions;

export type KeyServerOptions =
  SavedKeyServerOptions | GeneratedKeyServerOptions | ImportedKeyServerOptions;

  export type ServerStatus = "online" | "offline";