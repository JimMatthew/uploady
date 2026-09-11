import {
  useState,
  useEffect,
  useCallback,
  useRef,
  lazy,
  Suspense,
} from "react";

import type { Dispatch, ReactNode, SetStateAction } from "react";

import SftpFileBrowser from "../pages/SftpFileBrowser";
import LocalFileBrowser from "../pages/LocalFileBrowser";
import AddServer from "../components/AddServer";
import SharedLinks from "../components/SharedLinks";

import apiClient from "../services/apiClient";
import type {
  SaveServerPayload,
  SaveServerResponse,
  SftpServer
} from "../types/server";
import {
  SaveServer,
  DeleteServer,
  fetchServerStatuses,
} from "../controllers/StoreServer";

import type { AppToast } from "./useAppToast";
import type { ServerStatuses } from "../types/server";
import { WorkspaceTab } from "../types/workspace";

const SshConsole = lazy(() => import("../pages/SshConsole"));
const FileEdit = lazy(() => import("../pages/FileEdit"));
const ServerInfo = lazy(() => import("../pages/ServerInfo"));
const TransfersPage = lazy(() => import("../pages/Transfers"));
const Settings = lazy(() => import("../pages/Settings"));
const ArchiveViewer = lazy(() => import("../pages/ArchiveViewer"));
const Actions = lazy(() => import("../pages/ActionsTab"));

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ServerListData {
  servers: SftpServer[];
}

interface OpenTabOptions {
  label: string;
  content: ReactNode;
}

export interface LocalFileSource {
  type: "local";
  currentDirectory: string;
  serverId?: never;
  host?: never;
}

export interface SftpFileSource {
  type: "sftp";
  currentDirectory: string;
  serverId: string;
  host?: string;
}

export interface ArchiveFileSource {
  type: "archive";
  currentDirectory: string;
  archivePath: string;
  entry: string;
  serverId?: never;
  host?: never;
}

export type WorkspaceFileSource =
  LocalFileSource | SftpFileSource | ArchiveFileSource;

interface OpenFileOptions {
  filename: string;
  source: WorkspaceFileSource;
  isNew?: boolean;
  readOnly?: boolean;
}

interface OpenSshOptions {
  initialCommand?: string;
}

interface FetchServersOptions {
  showLoading?: boolean;
}

interface UseWorkspaceOptions {
  toast: AppToast;
}

interface UseWorkspaceResult {
  loading: boolean;

  sftpServers: SftpServer[];
  serverStatuses: ServerStatuses;

  showSidebar: boolean;
  setShowSidebar: Dispatch<SetStateAction<boolean>>;

  tabs: WorkspaceTab[];
  activeTabIndex: number;
  setActiveTabIndex: Dispatch<SetStateAction<number>>;
  closeTab: (tabId: number) => void;

  openSftp: (server: SftpServer) => void;
  openSsh: (server: SftpServer, options?: OpenSshOptions) => void;

  openServerInfo: (server: SftpServer) => void;
  openNewServer: () => void;
  openLocalFiles: () => void;
  openSharedLinks: () => void;
  openTransfers: () => void;
  openSettings: () => void;
  openActions: () => void;

  deleteServer: (serverId: string) => Promise<boolean>;
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useWorkspace({
  toast,
}: UseWorkspaceOptions): UseWorkspaceResult {
  const nextTabId = useRef(1);
  const [loading, setLoading] = useState(true);
  const [sftpServers, setSftpServers] = useState<SftpServer[]>([]);
  const [serverStatuses, setServerStatuses] = useState<ServerStatuses>({});
  const [showSidebar, setShowSidebar] = useState(false);
  const [tabs, setTabs] = useState<WorkspaceTab[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // ---------------------------------------------------------------------------
  // Tab management
  // ---------------------------------------------------------------------------

  const openTab = useCallback(({ label, content }: OpenTabOptions): void => {
    setTabs((previous) => {
      const next: WorkspaceTab[] = [
        ...previous,
        {
          id: nextTabId.current++,
          label,
          content,
        },
      ];

      setActiveTabIndex(next.length - 1);

      return next;
    });
  }, []);

  const closeTab = useCallback((tabId: number): void => {
    setTabs((previous) => {
      const index = previous.findIndex((tab) => tab.id === tabId);

      if (index === -1) {
        return previous;
      }

      const next = previous.filter((tab) => tab.id !== tabId);

      setActiveTabIndex((activeIndex) => {
        if (next.length === 0) {
          return 0;
        }

        if (index > activeIndex) {
          return activeIndex;
        }

        if (index < activeIndex) {
          return activeIndex - 1;
        }

        return Math.min(index, next.length - 1);
      });

      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Server management
  // ---------------------------------------------------------------------------

 const fetchServers = useCallback(
  async ({ showLoading = false }: FetchServersOptions = {}): Promise<void> => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const data = await apiClient.get<ServerListData>("/sftp/api/");

      setSftpServers(data.servers);

      void fetchServerStatuses({
        data,
        setServerStatuses,
      }).catch((error: unknown) => {
        console.error("Failed to fetch server statuses:", error);
      });
    } catch (error: unknown) {
      console.error("Failed to fetch servers:", error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  },
  [],
);

const saveServer = useCallback(
  async (
    payload: SaveServerPayload,
  ): Promise<SaveServerResponse | null> => {
    const result = await SaveServer({
      ...payload,
      toast,
    });

    if (result) {
      await fetchServers();
    }

    return result;
  },
  [toast, fetchServers],
);

  const deleteServer = useCallback(
    async (serverId: string): Promise<boolean> => {
      const deleted = await DeleteServer({
        serverId,
        toast,
      });

      if (deleted) {
        await fetchServers();
      }

      return deleted;
    },
    [toast, fetchServers],
  );

  const openSettings = useCallback((): void => {
    openTab({
      label: "Settings",
      content: (
        <Suspense fallback={<div>Loading settings...</div>}>
          <Settings toast={toast} />
        </Suspense>
      ),
    });
  }, [openTab, toast]);

  // ---------------------------------------------------------------------------
  // File tabs
  // ---------------------------------------------------------------------------

  const openFile = useCallback(
    ({
      filename,
      source,
      isNew = false,
      readOnly = false,
    }: OpenFileOptions): void => {
      const extension = filename.split(".").pop()?.toLowerCase();

      let content: ReactNode;

      if (extension === "zip" && source.type === "local") {
        const archivePath = source.currentDirectory
          ? `${source.currentDirectory}/${filename}`
          : filename;

        content = (
          <Suspense fallback={<div>Loading archive...</div>}>
            <ArchiveViewer
              archivePath={archivePath}
              filename={filename}
              toast={toast}
              openFile={openFile}
            />
          </Suspense>
        );
      } else {
        content = (
          <Suspense fallback={<div>Loading file viewer...</div>}>
            <FileEdit
              serverId={source.type === "sftp" ? source.serverId : undefined}
              currentDirectory={source.currentDirectory}
              filename={filename}
              toast={toast}
              host={source.type === "sftp" ? source.host : undefined}
              remote={source.type === "sftp"}
              isNew={isNew}
              source={source}
              readOnly={readOnly}
            />
          </Suspense>
        );
      }

      openTab({
        label: filename,
        content,
      });
    },
    [openTab, toast],
  );

  const openLocalFiles = useCallback((): void => {
    openTab({
      label: "Local",
      content: <LocalFileBrowser toast={toast} openFile={openFile} />,
    });
  }, [openTab, toast, openFile]);

  // ---------------------------------------------------------------------------
  // Server tabs
  // ---------------------------------------------------------------------------

  const openSftp = useCallback(
    (server: SftpServer): void => {
      openTab({
        label: `${server.host} - SFTP`,
        content: (
          <SftpFileBrowser
            serverId={server._id}
            host={server.host}
            toast={toast}
            openFile={openFile}
          />
        ),
      });
    },
    [openTab, toast, openFile],
  );

  const openSsh = useCallback(
    (server: SftpServer, { initialCommand }: OpenSshOptions = {}): void => {
      openTab({
        label: `${server.host} - SSH`,
        content: (
          <Suspense fallback={<div>Loading SSH...</div>}>
            <SshConsole
              serverId={server._id}
              host={server.host}
              initialCommand={initialCommand}
            />
          </Suspense>
        ),
      });
    },
    [openTab],
  );

  const openActions = useCallback((): void => {
    openTab({
      label: "Actions",
      content: (
        <Suspense fallback={<div>Loading actions...</div>}>
          <Actions toast={toast} servers={sftpServers} openSsh={openSsh} />
        </Suspense>
      ),
    });
  }, [openTab, toast, sftpServers, openSsh]);

  const openServerInfo = useCallback(
    (server: SftpServer): void => {
      openTab({
        label: `${server.host} - Info`,
        content: (
          <Suspense fallback={<div>Loading server info...</div>}>
            <ServerInfo serverId={server._id} host={server.host} />
          </Suspense>
        ),
      });
    },
    [openTab],
  );

  const openNewServer = useCallback((): void => {
    openTab({
      label: "New Server",
      content: <AddServer handleSaveServer={saveServer} />,
    });
  }, [openTab, saveServer]);

  // ---------------------------------------------------------------------------
  // Utility tabs
  // ---------------------------------------------------------------------------

  const openTransfers = useCallback((): void => {
    openTab({
      label: "Transfers",
      content: (
        <Suspense fallback={<div>Loading transfers...</div>}>
          <TransfersPage toast={toast} />
        </Suspense>
      ),
    });
  }, [openTab, toast]);

  const openSharedLinks = useCallback((): void => {
    openTab({
      label: "Links",
      content: <SharedLinks />,
    });
  }, [openTab]);

  // ---------------------------------------------------------------------------
  // Initial load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    void fetchServers({
      showLoading: true,
    });
  }, [fetchServers]);

  return {
    loading,

    sftpServers,
    serverStatuses,

    showSidebar,
    setShowSidebar,

    tabs,
    activeTabIndex,
    setActiveTabIndex,
    closeTab,

    openSftp,
    openSsh,
    openServerInfo,
    openNewServer,
    openLocalFiles,
    openSharedLinks,
    openTransfers,
    openSettings,
    openActions,

    deleteServer,
  };
}
