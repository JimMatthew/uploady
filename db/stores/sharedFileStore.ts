interface SharedFileBase {
  _id: string;
  fileName: string;
  filePath: string;
  link: string;
  token: string;
  sharedAt: Date;
}

export interface LocalSharedFile extends SharedFileBase {
  isRemote: false;
  serverId?: never;
  serverName?: never;
}

export interface RemoteSharedFile extends SharedFileBase {
  isRemote: true;
  serverId: string;
  serverName: string;
}

/**
 * Canonical representation of a shared file.
 *
 * Local shares reference files on Uploady's local filesystem. Remote shares
 * additionally identify the configured server containing the shared file.
 */
export type SharedFile =
  | LocalSharedFile
  | RemoteSharedFile;

export interface CreateSharedFileInput {
  fileName: string;
  filePath: string;
  link: string;
  token: string;

  isRemote?: boolean;
  serverId?: string;
  serverName?: string;
}

/**
 * Persistence contract for Uploady file shares.
 *
 * Store implementations persist share metadata and return canonical SharedFile
 * records independent of the configured database backend.
 */
export abstract class SharedFileStore {
  /** Creates and persists a new file share. */
  abstract create(data: CreateSharedFileInput): Promise<SharedFile>;

  /** Finds a share by its public access token. */
  abstract findByToken(token: string): Promise<SharedFile | null>;

  /**
   * Deletes a share by token and returns the deleted share, or null when no
   * matching share exists.
   */
  abstract deleteByToken(token: string): Promise<SharedFile | null>;

  /**
   * Deletes the local share matching a file's path and name.
   */
  abstract deleteByPath(
    filePath: string,
    fileName: string,
  ): Promise<SharedFile | null>;

  /** Finds the local share associated with a file. */
  abstract findByFile(
    fileName: string,
    filePath: string,
  ): Promise<SharedFile | null>;

  /** Returns all persisted file shares. */
  abstract list(): Promise<SharedFile[]>;

  /**
   * Finds a remote share by file identity and source server.
   */
  abstract findRemoteShare(
    fileName: string,
    filePath: string,
    serverId: string,
  ): Promise<SharedFile | null>;
}
