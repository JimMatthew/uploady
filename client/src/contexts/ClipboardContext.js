import { createContext, useContext, useState } from "react";

const ClipboardContext = createContext();

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

  const clearClipboard = () => {
    setClipboard([]);
  };

  return (
    <ClipboardContext.Provider
      value={{ clipboard, copyFile, cutFile, clearClipboard }}
    >
      {children}
    </ClipboardContext.Provider>
  );
};

export const useClipboard = () => useContext(ClipboardContext);