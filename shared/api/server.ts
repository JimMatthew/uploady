// -----------------------------------------------------------------------------
// Password authentication
// -----------------------------------------------------------------------------

export interface PasswordServerRequest {
  host: string;
  username: string;
  authType: "password";
  password: string;
}

// -----------------------------------------------------------------------------
// Saved key authentication
// -----------------------------------------------------------------------------

export interface SavedKeyServerRequest {
  host: string;
  username: string;
  authType: "key";
  keyMode: "saved";
  keyId: string;
}

// -----------------------------------------------------------------------------
// Imported key authentication
// -----------------------------------------------------------------------------

export interface ImportedKeyServerRequest {
  host: string;
  username: string;
  authType: "key";
  keyMode: "import";
  key: string;
  passphrase?: string;
}

// -----------------------------------------------------------------------------
// Generated key authentication
// -----------------------------------------------------------------------------

export interface GeneratedKeyServerRequest {
  host: string;
  username: string;
  authType: "key";
  keyMode: "generate";
}

// -----------------------------------------------------------------------------
// Save server
// -----------------------------------------------------------------------------

export type SaveServerRequest =
  | PasswordServerRequest
  | SavedKeyServerRequest
  | ImportedKeyServerRequest
  | GeneratedKeyServerRequest;
