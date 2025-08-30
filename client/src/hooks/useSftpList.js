import React, { useState, useEffect } from "react";
import SftpFileFolderView from "../pages/SftpFileFolderViewer";
import SshConsole from "../pages/SshConsole";
import AddServer from "../components/AddServer";
import FileEdit from "../pages/FileEdit";
import FileList from "../pages/FileList";
import { useNavigate } from "react-router-dom";
import {
  SaveServer,
  DeleteServer,
  fetchServerStatuses,
} from "../controllers/StoreServer";
export function useSftpList({ toast }) {
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(false);
  const [sftpServers, setSftpServers] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [tabs, setTabs] = useState([]);
  const [serverStatuses, setServerStatuses] = useState({});
  const navigate = useNavigate();
  const addTabItem = ({ id, label, content }) => {
    const newTab = {
      id,
      label,
      content,
    };
    setTabs((prevTabs) => [...prevTabs, newTab]);
  };

  const closeTab = (indexToRemove) => {
    setTabs((prevTabs) =>
      prevTabs.filter((_, index) => index !== indexToRemove)
    );
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

  const setuser = (user) => {};

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
      content: <FileList setUser={setuser} toast={toast} />,
    });
  };

  const handleSaveServer = async (host, username, password) => {
    await SaveServer({ host, username, password, toast });
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
  };
}
