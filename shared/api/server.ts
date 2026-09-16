export interface PasswordServerRequest {
  host: string;
  username: string;
  authType: "password";
  password: string;
}

export interface SavedKeyServerRequest {
  host: string;
  username: string;
  authType: "key";
  keyMode: "saved";
  keyId: string;
}

export interface ImportedKeyServerRequest {
  host: string;
  username: string;
  authType: "key";
  keyMode: "import";
  key: string;
  passphrase?: string;
}

export interface GeneratedKeyServerRequest {
  host: string;
  username: string;
  authType: "key";
  keyMode: "generate";
}

export type SaveServerRequest =
  | PasswordServerRequest
  | SavedKeyServerRequest
  | ImportedKeyServerRequest
  | GeneratedKeyServerRequest;