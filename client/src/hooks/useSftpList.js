import { useState, useEffect, useCallback, useRef } from "react";
import SftpFileFolderView from "../pages/SftpFileFolderViewer";
import SshConsole from "../pages/SshConsole";
import AddServer from "../components/AddServer";
import FileEdit from "../pages/FileEdit";
import FileList from "../pages/FileList";
import SharedLinks from "../components/SharedLinks";
import { useNavigate } from "react-router-dom";
import {
  SaveServer,
  DeleteServer,
  fetchServerStatuses,
} from "../controllers/StoreServer";

export function useSftpList({ toast }) {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const nextId = useRef(1);

  const [loading, setLoading] = useState(false);
  const [sftpServers, setSftpServers] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [tabs, setTabs] = useState([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [serverStatuses, setServerStatuses] = useState({});

  // ---------------------------------------------------------------------------
  // Tab management
  // ---------------------------------------------------------------------------

  const addTabItem = useCallback(({ label, content }) => {
    setTabs((prev) => {
      const newTabs = [...prev, { id: nextId.current++, label, content }];
      setActiveTabIndex(newTabs.length - 1);
      return newTabs;
    });
  }, []);

  const closeTab = useCallback((keyToRemove) => {
    setTabs((prevTabs) => {
      const idx = prevTabs.findIndex((t) => t.id === keyToRemove);
      if (idx === -1) return prevTabs;

      const next = prevTabs.filter((t) => t.id !== keyToRemove);

      setActiveTabIndex((prevActive) => {
        if (idx > prevActive) return prevActive;
        return Math.max(0, prevActive - 1);
      });

      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Tab openers
  // ---------------------------------------------------------------------------

  const handleOpenFile = useCallback(
    (serverId, currentDirectory, filename, host, remote, isNew) => {
      addTabItem({
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
    [addTabItem, toast],
  );

  const handleSshLaunch = useCallback(
    (server) => {
      addTabItem({
        label: `${server.host} - SSH`,
        content: <SshConsole serverId={server._id} />,
      });
    },
    [addTabItem],
  );

  const handleNewServer = useCallback(() => {
    addTabItem({
      label: "New Server",
      content: <AddServer handleSaveServer={handleSaveServer} />,
    });
  }, [addTabItem]);

  const handleLocalTab = useCallback(() => {
    addTabItem({
      label: "Local",
      content: (
        <FileList toast={toast} hideLink={true} openFile={handleOpenFile} />
      ),
    });
  }, [addTabItem, toast, handleOpenFile]);

  const handleSharedLinks = useCallback(() => {
    addTabItem({
      label: "Links",
      content: <SharedLinks />,
    });
  }, [addTabItem]);

  const handleConnect = useCallback(
    (server) => {
      addTabItem({
        label: `${server.host} - SFTP`,
        content: (
          <SftpFileFolderView
            serverId={server._id}
            toast={toast}
            openFile={handleOpenFile}
            host={server.host}
          />
        ),
      });
    },
    [addTabItem, toast, handleOpenFile],
  );

  // ---------------------------------------------------------------------------
  // Server management
  // ---------------------------------------------------------------------------

  const fetchServers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/sftp/api/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.status === 401 || res.status === 403) {
        navigate("/");
        return;
      }

      if (!res.ok) {
        console.error("Failed to fetch servers:", res.status);
        return;
      }

      const data = await res.json();
      setSftpServers(data);
      setLoading(false);
      await fetchServerStatuses({ data, setServerStatuses });
    } catch (err) {
      console.error("Error fetching servers:", err);
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  const handleSaveServer = useCallback(
    async (host, username, password, authType, passphrase) => {
      await SaveServer({
        host,
        username,
        password,
        authMethod: authType,
        toast,
        passphrase,
      });
      fetchServers();
    },
    [toast, fetchServers],
  );

  const deleteServer = useCallback(
    async (serverId) => {
      await DeleteServer({ serverId, toast });
      fetchServers();
    },
    [toast, fetchServers],
  );

  // ---------------------------------------------------------------------------
  // Auth + initial load

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    fetchServers();
  }, [fetchServers, navigate, token]);

  return {
    loading,
    sftpServers,
    showSidebar,
    setShowSidebar,
    tabs,
    serverStatuses,
    activeTabIndex,
    setActiveTabIndex,
    closeTab,
    handleConnect,
    handleNewServer,
    handleSshLaunch,
    handleLocalTab,
    handleSharedLinks,
    deleteServer,
  };
}
