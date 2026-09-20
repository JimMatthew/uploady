export interface CreateFolderRequest {
  folderName: string;
  currentPath?: string;
}

export interface CreateFolderResponse {
  message: string;
}

export interface DeleteFolderRequest {
  folderPath: string;
  folderName: string;
}

export interface DeleteFolderResponse {
  message: string;
}

export interface DeleteFilesRequest {
  currentDirectory: string;
  fileNames: string[];
}

export interface DeleteFileResult {
  path: string;
  success: boolean;
  error?: string;
}

export interface DeleteFilesResponse {
  results: DeleteFileResult[];
}

export interface RenameFileRequest {
  filename: string;
  newFilename: string;
  currentPath: string;
}

export interface RenameFileResponse {
  message: string;
}

export interface DeleteFileResponse {
  message: string;
}