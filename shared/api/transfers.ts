export interface TransferRequestFileBase {
  file: string;
  path: string;
  isDirectory: boolean;
  size?: number;
}

export interface LocalTransferRequestFile extends TransferRequestFileBase {
  source: "local";
  serverId: null;
}

export interface SftpTransferRequestFile extends TransferRequestFileBase {
  source: "sftp";
  serverId: string;
}

export interface ArchiveTransferRequestFile extends TransferRequestFileBase {
  source: "archive";
  serverId: null;
  archivePath: string;
}

export type TransferRequestFile =
  | LocalTransferRequestFile
  | SftpTransferRequestFile
  | ArchiveTransferRequestFile;

export interface LocalPasteRequest {
  files: TransferRequestFile[];
  newPath: string;
}

export interface SftpCopyRequest {
  files: TransferRequestFile[];
  newPath: string;
  newServerId: string;
}

export interface SftpCopyResponse {
  jobId: string;
}

export interface LocalPasteRequest {
  files: TransferRequestFile[];
  newPath: string;
}

export interface LocalPasteResponse {
  jobId: string;
}