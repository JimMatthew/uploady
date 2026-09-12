import { createContext, useContext, useState, type ReactNode } from "react";

export type ClipboardAction = "copy" | "cut";

export type ClipboardSource =
  | "local"
  | "sftp"
  | "archive";

export interface ClipboardSourceItem {
  file: string;
  path: string;
  source: ClipboardSource;
  serverId?: string | null;
  archivePath?: string;
  isDirectory?: boolean;
}

export interface ClipboardItem {
  file: string;
  path: string;
  source: ClipboardSource;
  serverId: string | null;
  archivePath?: string;
  isDirectory: boolean;
  action: ClipboardAction;
}

interface ClipboardContextValue {
  clipboard: ClipboardItem[];

  copyFile: (files: ClipboardSourceItem | ClipboardSourceItem[]) => void;

  cutFile: (files: ClipboardSourceItem | ClipboardSourceItem[]) => void;

  clearClipboard: () => void;

  removeFromClipboard: (file: string, filePath: string) => void;
}

interface ClipboardProviderProps {
  children: ReactNode;
}

const ClipboardContext = createContext<ClipboardContextValue | undefined>(
  undefined,
);

/**
 * Provides a cross-folder, cross-server clipboard for file operations.
 *
 * Clipboard items contain enough information to locate and transfer
 * files or directories across local and SFTP sources.
 */
export const ClipboardProvider = ({ children }: ClipboardProviderProps) => {
  const [clipboard, setClipboard] = useState<ClipboardItem[]>([]);

  const addToClipboard = (items: ClipboardItem | ClipboardItem[]): void => {
    const newItems = Array.isArray(items) ? items : [items];

    setClipboard((previous) => [...previous, ...newItems]);
  };

  const copyFile = (
    files: ClipboardSourceItem | ClipboardSourceItem[],
  ): void => {
    const sourceFiles = Array.isArray(files) ? files : [files];

    const items: ClipboardItem[] = sourceFiles.map((file) => ({
      ...file,
      action: "copy",
      isDirectory: file.isDirectory ?? false,
      serverId: file.serverId ?? null,
    }));

    addToClipboard(items);
  };

  const cutFile = (
    files: ClipboardSourceItem | ClipboardSourceItem[],
  ): void => {
    const sourceFiles = Array.isArray(files) ? files : [files];

    const items: ClipboardItem[] = sourceFiles.map((file) => ({
      ...file,
      action: "cut",
      isDirectory: file.isDirectory ?? false,
      serverId: file.serverId ?? null,
    }));

    addToClipboard(items);
  };

  /**
   * Removes a single item from the clipboard by file + path.
   */
  const removeFromClipboard = (file: string, filePath: string): void => {
    setClipboard((previous) =>
      previous.filter(
        (item) => !(item.file === file && item.path === filePath),
      ),
    );
  };

  const clearClipboard = (): void => {
    setClipboard([]);
  };

  return (
    <ClipboardContext.Provider
      value={{
        clipboard,
        copyFile,
        cutFile,
        clearClipboard,
        removeFromClipboard,
      }}
    >
      {children}
    </ClipboardContext.Provider>
  );
};

export const useClipboard = (): ClipboardContextValue => {
  const context = useContext(ClipboardContext);

  if (!context) {
    throw new Error("useClipboard must be used within a ClipboardProvider");
  }

  return context;
};
