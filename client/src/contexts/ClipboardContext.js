import { createContext, useContext, useState } from "react";

const ClipboardContext = createContext();

export const ClipboardProvider = ({ children }) => {
  const [clipboard, setClipboard] = useState(null);

  const copyFile = ({ file, path, source, serverId }) => {
    setClipboard({
      file,
      path,
      source,
      serverId: serverId || null,
      action: "copy",
    });
  };

  const cutFile = ({ file, path, source, serverId }) => {
    setClipboard({
      file,
      path,
      source,
      serverId: serverId || null,
      action: "cut",
    });
  };

  const clearClipboard = () => {
    setClipboard(null);
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
