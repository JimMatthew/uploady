// -----------------------------------------------------------------------------
// Directory listing
// -----------------------------------------------------------------------------

export interface SftpListDirectoryFile {
  name: string;
  size: string;
  date: string;
}

export interface SftpListDirectoryFolder {
  name: string;
}

export interface SftpListDirectoryResponse {
  files: SftpListDirectoryFile[];
  folders: SftpListDirectoryFolder[];
  currentDirectory: string;
  serverId: string;
  host: string;
}

// -----------------------------------------------------------------------------
// Rename file
// -----------------------------------------------------------------------------

export interface SftpRenameFileRequest {
  currentPath: string;
  fileName: string;
  newFileName: string;
  serverId: string;
}

export interface SftpRenameFileResponse {
  message: string;
}

// -----------------------------------------------------------------------------
// Delete file
// -----------------------------------------------------------------------------

export interface SftpDeleteFileRequest {
  serverId: string;
  currentDirectory: string;
  fileName: string;
}

export interface SftpDeleteFileResponse {
  message: string;
}

// -----------------------------------------------------------------------------
// Delete files
// -----------------------------------------------------------------------------

export interface SftpDeleteFilesRequest {
  serverId: string;
  currentDirectory: string;
  fileNames: string[];
}

export interface SftpDeleteFileResult {
  path: string;
  success: boolean;
  error?: string;
}

export interface SftpDeleteFilesResponse {
  results: SftpDeleteFileResult[];
}

// -----------------------------------------------------------------------------
// Delete folder
// -----------------------------------------------------------------------------

export interface SftpDeleteFolderRequest {
  serverId: string;
  currentDirectory: string;
  deleteDir: string;
}

export interface SftpDeleteFolderResponse {
  message: string;
}

// -----------------------------------------------------------------------------
// Create folder
// -----------------------------------------------------------------------------

export interface SftpCreateFolderRequest {
  currentPath: string;
  folderName: string;
  serverId: string;
}

export interface SftpCreateFolderResponse {
  message: string;
  path: string;
}

// -----------------------------------------------------------------------------
// Share file
// -----------------------------------------------------------------------------

export interface SftpShareFileRequest {
  serverId: string;
  remotePath: string;
}

export interface SftpShareFileResponse {
  link: string;
}