import { ReactNode } from "react";

export interface WorkspaceTab {
  id: number;
  label: string;
  content: ReactNode;
}

export interface LocalFileSource {
  type: "local";
  currentDirectory: string;
}

export interface SftpFileSource {
  type: "sftp";
  currentDirectory: string;
  serverId: string;
  host: string;
}

export interface ArchiveFileSource {
  type: "archive";
  archivePath: string;
  entry: string;
}

export type WorkspaceFileSource =
  | LocalFileSource
  | SftpFileSource
  | ArchiveFileSource;

export interface OpenFileOptions<
  TSource extends WorkspaceFileSource = WorkspaceFileSource,
> {
  filename: string;
  source: TSource;
  isNew?: boolean;
  readOnly?: boolean;
}

export type OpenArchiveFileOptions =
  OpenFileOptions<ArchiveFileSource> & {
    readOnly: true;
  };