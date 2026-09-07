import {
  useState,
  useEffect,
  useCallback,
  useRef,
  lazy,
  Suspense,
} from "react";

import SftpFileBrowser from "../pages/SftpFileBrowser";
import LocalFileBrowser from "../pages/LocalFileBrowser";
import AddServer from "../components/AddServer";
import SharedLinks from "../components/SharedLinks";
import apiClient from "../services/apiClient";
import {
  SaveServer,
  DeleteServer,
  fetchServerStatuses,
} from "../controllers/StoreServer";

const SshConsole = lazy(() => import("../pages/SshConsole"));
const FileEdit = lazy(() => import("../pages/FileEdit"));
const ServerInfo = lazy(() => import("../pages/ServerInfo"));
const TransfersPage = lazy(() => import("../pages/Transfers"));
const Settings = lazy(() => import("../pages/Settings"));
const ArchiveViewer = lazy(() => import("../pages/ArchiveViewer"));
const Actions = lazy(() => import("../pages/ActionsTab"));
export function useWorkspace({ toast }) {
  const nextTabId = useRef(1);

  const [loading, setLoading] = useState(true);
  const [sftpServers, setSftpServers] = useState([]);
  const [serverStatuses, setServerStatuses] = useState({});

  const [showSidebar, setShowSidebar] = useState(false);

  const [tabs, setTabs] = useState([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // ---------------------------------------------------------------------------
  // Tab management
  // ---------------------------------------------------------------------------

  const openTab = useCallback(({ label, content }) => {
    setTabs((prev) => {
      const next = [
        ...prev,
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

  const closeTab = useCallback((tabId) => {
    setTabs((prev) => {
      const index = prev.findIndex((tab) => tab.id === tabId);

      if (index === -1) {
        return prev;
      }

      const next = prev.filter((tab) => tab.id !== tabId);

      setActiveTabIndex((activeIndex) => {
        if (index > activeIndex) {
          return activeIndex;
        }

        return Math.max(0, activeIndex - 1);
      });

      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Server management
  // ---------------------------------------------------------------------------

  const fetchServers = useCallback(async ({ showLoading = false } = {}) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const data = await apiClient.get("/sftp/api/");

      setSftpServers(data);

      fetchServerStatuses({
        data,
        setServerStatuses,
      }).catch((err) => {
        console.error("Failed to fetch server statuses:", err);
      });
    } catch (err) {
      console.error("Failed to fetch servers:", err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  const saveServer = useCallback(
    async (server) => {
      const result = await SaveServer({
        ...server,
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
    async (serverId) => {
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

  const openSettings = useCallback(() => {
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
    ({ filename, source, isNew = false, readOnly = false }) => {
      const extension = filename.split(".").pop()?.toLowerCase();

      let content;

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
              serverId={source.serverId}
              currentDirectory={source.currentDirectory}
              filename={filename}
              toast={toast}
              host={source.host}
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

  const openLocalFiles = useCallback(() => {
    openTab({
      label: "Local",
      content: <LocalFileBrowser toast={toast} hideLink openFile={openFile} />,
    });
  }, [openTab, toast, openFile]);

  // ---------------------------------------------------------------------------
  // Server tabs
  // ---------------------------------------------------------------------------

  const openSftp = useCallback(
    (server) => {
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
    (server, { initialCommand } = {}) => {
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

  const openActions = useCallback(() => {
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
    (server) => {
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

  const openNewServer = useCallback(() => {
    openTab({
      label: "New Server",
      content: <AddServer handleSaveServer={saveServer} />,
    });
  }, [openTab, saveServer]);

  // ---------------------------------------------------------------------------
  // Utility tabs
  // ---------------------------------------------------------------------------

  const openTransfers = useCallback(() => {
    openTab({
      label: "Transfers",
      content: (
        <Suspense fallback={<div>Loading transfers...</div>}>
          <TransfersPage toast={toast} />
        </Suspense>
      ),
    });
  }, [openTab, toast]);

  const openSharedLinks = useCallback(() => {
    openTab({
      label: "Links",
      content: <SharedLinks />,
    });
  }, [openTab]);

  // ---------------------------------------------------------------------------
  // Initial load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetchServers({ showLoading: true });
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
