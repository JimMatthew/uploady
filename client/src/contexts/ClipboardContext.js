import { createContext, useContext, useState } from "react";

const ClipboardContext = createContext();

export const ClipboardProvider = ({ children }) => {
  const [clipboard, setClipboard] = useState([]);

  const addToClipboard = ({ file, path, source, serverId, action }) => {
    setClipboard((prev) => [
      ...prev,
      { file, path, source, serverId: serverId || null, action },
    ]);
  };

  const copyFile = (params) => {
    addToClipboard({ ...params, action: "copy" });
  };

  const cutFile = (params) => {
    addToClipboard({ ...params, action: "cut" });
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
