import React, { useState, useEffect } from "react";
import SftpFileFolderView from "../pages/SftpFileFolderViewer";
import SshConsole from "../pages/SshConsole";
import AddServer from "../components/AddServer";
import FileEdit from "../pages/FileEdit";
import FileList from "../pages/FileList";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import {
  SaveServer,
  DeleteServer,
  fetchServerStatuses,
} from "../controllers/StoreServer";
let nextId = 0;
export function useSftpList({ toast }) {
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(false);
  const [sftpServers, setSftpServers] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [tabs, setTabs] = useState([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [serverStatuses, setServerStatuses] = useState({});
  const navigate = useNavigate();

  const addTabItem = ({ id, label, content }) => {
    setTabs((prev) => {
      const newTabs = [...prev, { id: nextId++ , label, content }];
      setActiveTabIndex(newTabs.length - 1);
      return newTabs;
    });
  };

    const closeTab = (keyToRemove) => {
    setTabs(prevTabs => {
      const idx = prevTabs.findIndex(t => t.id === keyToRemove);
      if (idx === -1) return prevTabs;

      const next = prevTabs.filter(t => t.id !== keyToRemove);

      setActiveTabIndex(prevActive => {
        if (idx === prevActive) return Math.max(0, prevActive - 1);
        if (idx < prevActive) return prevActive - 1;
        return prevActive;
      });

      return next;
    });
  };

  const handleOpenFile = async (serverId, currentDirectory, filename) => {
    addTabItem({
      id: filename,
      label: filename,
      content: (
        <FileEdit
          serverId={serverId}
          currentDirectory={currentDirectory}
          filename={filename}
          toast={toast}
        />
      ),
    });
  };

  const handleSshLaunch = (server) => {
    addTabItem({
      id: server._id,
      label: `${server.host} - SSH`,
      content: <SshConsole serverId={server._id} />,
    });
  };

  const handleNewServer = () => {
    addTabItem({
      id: "new",
      label: "New Server",
      content: <AddServer handleSaveServer={handleSaveServer} />,
    });
  };

  const handleLocalTab = () => {
    addTabItem({
      id: "Local",
      label: "Local",
      content: <FileList toast={toast} />,
    });
  };

  const handleSaveServer = async (host, username, password, authMethod) => {
    await SaveServer({ host, username, password,authMethod, toast,  });
    fetchServers();
  };

  const deleteServer = async (serverId) => {
    await DeleteServer({ serverId: serverId, toast: toast });
    fetchServers();
  };

  useEffect(() => {
    if (token) {
      fetchServers();
    } else {
      navigate("/");
      console.error("No token found");
    }
  }, []);

  const handleConnect = async (server) => {
    addTabItem({
      id: server._id,
      label: `${server.host} - SFTP`,
      content: (
        <SftpFileFolderView
          serverId={server._id}
          toast={toast}
          openFile={handleOpenFile}
        />
      ),
    });
  };

  const fetchServers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/sftp/api/", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.status !== 200) {
        navigate("/");
        return;
      }
      const data = await res.json();
      setSftpServers(data);
      await fetchServerStatuses({ data, setServerStatuses });
    } catch (err) {
      console.error("Error fetching files:", err);
    } finally {
      setLoading(false);
    }
  };
  return {
    loading,
    sftpServers,
    showSidebar,
    setShowSidebar,
    tabs,
    serverStatuses,
    closeTab,
    handleNewServer,
    handleSshLaunch,
    deleteServer,
    handleConnect,
    handleLocalTab,
    activeTabIndex,
    setActiveTabIndex,
  };
}
