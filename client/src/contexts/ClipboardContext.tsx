import { createContext, useContext, useState, type ReactNode } from "react";

export type ClipboardAction = "copy" | "cut";

interface ClipboardSourceItemBase {
  file: string;
  path: string;
  isDirectory?: boolean;
}

interface LocalClipboardSourceItem extends ClipboardSourceItemBase {
  source: "local";
  serverId?: null;
}

interface SftpClipboardSourceItem extends ClipboardSourceItemBase {
  source: "sftp";
  serverId: string;
}

interface ArchiveClipboardSourceItem extends ClipboardSourceItemBase {
  source: "archive";
  serverId?: null;
  archivePath: string;
}

export type ClipboardSourceItem =
  | LocalClipboardSourceItem
  | SftpClipboardSourceItem
  | ArchiveClipboardSourceItem;

interface ClipboardItemBase {
  file: string;
  path: string;
  isDirectory: boolean;
  action: ClipboardAction;
}

interface LocalClipboardItem extends ClipboardItemBase {
  source: "local";
  serverId: null;
}

interface SftpClipboardItem extends ClipboardItemBase {
  source: "sftp";
  serverId: string;
}

interface ArchiveClipboardItem extends ClipboardItemBase {
  source: "archive";
  serverId: null;
  archivePath: string;
}

export type ClipboardItem =
  | LocalClipboardItem
  | SftpClipboardItem
  | ArchiveClipboardItem;

export type ClipboardSource =
  | "local"
  | "sftp"
  | "archive";

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

  const items = sourceFiles.map((file) =>
    toClipboardItem(file, "copy"),
  );

  addToClipboard(items);
};

 const cutFile = (
  files: ClipboardSourceItem | ClipboardSourceItem[],
): void => {
  const sourceFiles = Array.isArray(files) ? files : [files];

  const items = sourceFiles.map((file) =>
    toClipboardItem(file, "cut"),
  );

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

  const toClipboardItem = (
  file: ClipboardSourceItem,
  action: ClipboardAction,
): ClipboardItem => {
  const base = {
    file: file.file,
    path: file.path,
    isDirectory: file.isDirectory ?? false,
    action,
  };

  switch (file.source) {
    case "local":
      return {
        ...base,
        source: "local",
        serverId: null,
      };

    case "sftp":
      return {
        ...base,
        source: "sftp",
        serverId: file.serverId,
      };

    case "archive":
      return {
        ...base,
        source: "archive",
        serverId: null,
        archivePath: file.archivePath,
      };
  }
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
