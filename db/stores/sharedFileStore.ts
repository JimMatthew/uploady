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

export abstract class SharedFileStore {
  abstract create(data: CreateSharedFileInput): Promise<SharedFile>;

  abstract findByToken(token: string): Promise<SharedFile | null>;

  abstract deleteByToken(token: string): Promise<SharedFile | null>;

  abstract deleteByPath(
    filePath: string,
    fileName: string,
  ): Promise<SharedFile | null>;

  abstract findByFile(
    fileName: string,
    filePath: string,
  ): Promise<SharedFile | null>;

  abstract list(): Promise<SharedFile[]>;

  abstract findRemoteShare(
    fileName: string,
    filePath: string,
    serverId: string,
  ): Promise<SharedFile | null>;
}
