import React, { useState, useEffect } from "react";
import SftpFileFolderView from "../pages/SftpFileFolderViewer";
import SshConsole from "../pages/SshConsole";
import AddServer from "../components/AddServer";
import FileEdit from "../pages/FileEdit";
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

    const handleSaveServer = async (host, username, password) => {
        await SaveServer({ host, username, password, toast });
        fetchFiles();
    };

    const deleteServer = async (serverId) => {
        await DeleteServer({ serverId: serverId, toast: toast });
        fetchFiles();
    };

    useEffect(() => {
        if (token) {
            fetchFiles();
        } else {
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

    const fetchFiles = async () => {
        setLoading(true);
        fetch("/sftp/api/", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setSftpServers(data);
                return data;
            })
            .then((data) => fetchServerStatuses({ data, setServerStatuses }))
            .then(setLoading(false))
            .catch((err) => console.error("Error fetching files:", err));
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
        handleConnect
    }
}