import { createContext, useContext, useState } from "react";

const ClipboardContext = createContext();

/**
 * Provides a cross-folder, cross-server clipboard for file operations.
 * Each item carries enough metadata to locate and transfer the file
 * regardless of whether it lives locally or on a remote SFTP server.
 *
 * Item shape:
 *   { file: string, path: string, serverId: string|null, isDirectory: boolean, action: 'copy'|'cut' }
 */
export const ClipboardProvider = ({ children }) => {
  const [clipboard, setClipboard] = useState([]);

  // Add one or multiple files to the clipboard
  const addToClipboard = (items) => {
    const newItems = Array.isArray(items) ? items : [items];
    setClipboard((prev) => [...prev, ...newItems]);
  };

  // Copy multiple files
  const copyFile = (files) => {
    const items = (Array.isArray(files) ? files : [files]).map((f) => ({
      ...f,
      action: "copy",
      isDirectory: f.isDirectory || false,
      serverId: f.serverId || null,
    }));
    addToClipboard(items);
  };

  // Cut multiple files
  const cutFile = (files) => {
    const items = (Array.isArray(files) ? files : [files]).map((f) => ({
      ...f,
      action: "cut",
      isDirectory: f.isDirectory || false,
      serverId: f.serverId || null,
    }));
    addToClipboard(items);
  };

  /** Removes a single item from the clipboard by file + path. */
  const removeFromClipboard = (file, filePath) => {
    setClipboard((prev) =>
      prev.filter((i) => !(i.file === file && i.path === filePath)),
    );
  };

  const clearClipboard = () => {
    setClipboard([]);
  };

  return (
    <ClipboardContext.Provider
      value={{ clipboard, copyFile, cutFile, clearClipboard, removeFromClipboard }}
    >
      {children}
    </ClipboardContext.Provider>
  );
};

export const useClipboard = () => useContext(ClipboardContext);