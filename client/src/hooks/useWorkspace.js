import { useState, useEffect, useCallback, useRef } from "react";

import SftpFileBrowser from "../pages/SftpFileBrowser";
import LocalFileBrowser from "../pages/LocalFileBrowser";
import SshConsole from "../pages/SshConsole";
import AddServer from "../components/AddServer";
import FileEdit from "../pages/FileEdit";
import ServerInfo from "../pages/ServerInfo";
import SharedLinks from "../components/SharedLinks";
import TransfersPage from "../pages/Transfers";
import Settings from "../pages/Settings";
import apiClient from "../services/apiClient";

import {
  SaveServer,
  DeleteServer,
  fetchServerStatuses,
} from "../controllers/StoreServer";

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
      content: <Settings toast={toast} />,
    });
  }, [openTab, toast]);
  // ---------------------------------------------------------------------------
  // File tabs
  // ---------------------------------------------------------------------------

  const openFile = useCallback(
    (serverId, currentDirectory, filename, host, remote, isNew) => {
      openTab({
        label: filename,
        content: (
          <FileEdit
            serverId={serverId}
            currentDirectory={currentDirectory}
            filename={filename}
            toast={toast}
            host={host}
            remote={remote}
            isNew={isNew}
          />
        ),
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
    (server) => {
      openTab({
        label: `${server.host} - SSH`,
        content: <SshConsole serverId={server._id} host={server.host} />,
      });
    },
    [openTab],
  );

  const openServerInfo = useCallback(
    (server) => {
      openTab({
        label: `${server.host} - Info`,
        content: <ServerInfo serverId={server._id} host={server.host} />,
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
      content: <TransfersPage toast={toast} />,
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

    deleteServer,
  };
}
