
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
  files: FileEntry[];
  folders: FolderEntry[];
}

export type FileAction = (
  fileName: string,
) => void | Promise<void>;

export type RenameFileAction = (
  currentName: string,
  newName: string,
) => void | Promise<void>;

  export const SORT_FIELDS = {
  NAME: "name",
  SIZE: "size",
  DATE: "date",
} as const;

export type SortField =
  (typeof SORT_FIELDS)[keyof typeof SORT_FIELDS];

export const SORT_DIRECTIONS = {
  ASC: "asc",
  DESC: "desc",
} as const;

export type SortDirection =
  (typeof SORT_DIRECTIONS)[keyof typeof SORT_DIRECTIONS];

export interface BreadcrumbEntry {
  name: string;
  path: string;
}

export interface FileUploadProps {
  apiEndpoint: string;
  additionalData?: Record<string, unknown>;
  onUploadSuccess?: () => void | Promise<void>;
}

export type FileBatchAction = (
  fileNames: string[],
) => void | Promise<void>;

export interface MenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuState {
  position: MenuPosition;
  target: string | null;
  visible: boolean;
}

export interface FileBrowser {
  currentPath: string,
  files: FileListing;
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
  deleteFiles: FileBatchAction;
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

  error: string | null;
}