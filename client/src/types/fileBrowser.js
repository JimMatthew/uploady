/**
 * @typedef {Object} FileBrowser
 * @property {Object} files
 * @property {boolean} loading
 *
 * @property {(folder: string) => void} openFolder
 * @property {(path: string) => void} changeDirectory
 * @property {() => void} reload
 *
 * @property {(name: string) => void} downloadFile
 * @property {(name: string) => void} downloadFolder
 * @property {(name: string) => void} deleteFile
 * @property {(name: string, newName: string) => void} renameFile
 * @property {(name: string) => void} shareFile
 *
 * @property {(name: string) => void} copyFile
 * @property {(name: string) => void} cutFile
 * @property {() => void} paste
 *
 * @property {(name: string) => void} createFolder
 * @property {(name: string) => void} deleteFolder
 * @property {(name: string) => void} copyFolder
 *
 * @property {Function} generateBreadcrumb
 * @property {Object} progressMap
 * @property {Array} startedTransfers
 */

export {};