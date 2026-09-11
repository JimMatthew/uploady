
import type {
  TransferProgressMap,
} from "./transfer";

export interface FileEntry {
  name: string;
  size?: string | number | null;
  date?: string | number | Date | null;
}

export interface FolderEntry {
  name: string;
}

export interface FileListing {
  files?: FileEntry[];
  folders?: FolderEntry[];
  relativePath?: string | null;
}

export type FileAction = (
  fileName: string,
) => void | Promise<void>;

export type RenameFileAction = (
  currentName: string,
  newName: string,
) => void | Promise<void>;

export type SortField =
  | "name"
  | "size"
  | "date";

export type SortDirection =
  | "asc"
  | "desc";

export interface BreadcrumbEntry {
  name: string;
  path: string;
}

export interface FileBrowser {
  currentPath: string,
  files: FileListing | null;
  loading: boolean;

  openFolder: (
    folderName: string,
  ) => void | Promise<unknown>;

  changeDirectory: (
    path: string,
  ) => void | Promise<unknown>;

  reload: () =>
    void | Promise<unknown>;

  downloadFile: FileAction;
  downloadFolder: FileAction;

  deleteFile: FileAction;
  renameFile: RenameFileAction;
  shareFile: FileAction;

  copyFile: FileAction;
  cutFile: FileAction;
  copyFolder: FileAction;

  paste: () =>
    void | Promise<void>;

  createFolder: FileAction;
  deleteFolder: FileAction;

  breadcrumbs: BreadcrumbEntry[];

  progressMap: TransferProgressMap;
  startedTransfers: TransferProgressMap;
}