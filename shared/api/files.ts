// -----------------------------------------------------------------------------
// Create folder
// -----------------------------------------------------------------------------

export interface CreateFolderRequest {
  folderName: string;
  currentPath?: string;
}

export interface CreateFolderResponse {
  message: string;
}

// -----------------------------------------------------------------------------
// Delete folder
// -----------------------------------------------------------------------------

export interface DeleteFolderRequest {
  folderPath: string;
  folderName: string;
}

export interface DeleteFolderResponse {
  message: string;
}

// -----------------------------------------------------------------------------
// Delete file
// -----------------------------------------------------------------------------

export interface DeleteFileResponse {
  message: string;
}

// -----------------------------------------------------------------------------
// Delete files
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Rename file
// -----------------------------------------------------------------------------

export interface RenameFileRequest {
  filename: string;
  newFilename: string;
  currentPath: string;
}

export interface RenameFileResponse {
  message: string;
}
