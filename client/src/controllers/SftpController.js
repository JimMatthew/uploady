import { useNavigate } from "react-router-dom";

const SftpController = ({ toast, setFiles }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  async function apiRequest(url, options = {}, expectBlob = false) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (response.status === 401) {
        navigate("/");
        throw new Error("Unauthorized");
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Request failed");
      }

      return expectBlob ? response.blob() : response.json();
    } catch (error) {
      console.error("API error:", error);
      throw error;
    }
  }

  /**
   * Toast helper
   */
  const showToast = (title, status, description = null) => {
    toast({
      title,
      description,
      status,
      duration: 3000,
      isClosable: true,
    });
  };

  /**
   * SFTP operations
   */
  const deleteSftpFile = async (filename, serverId, currentDirectory = "/") => {
    try {
      await apiRequest("/sftp/api/delete-file", {
        method: "POST",
        body: JSON.stringify({
          currentDirectory,
          serverId,
          fileName: filename,
        }),
      });
      await changeSftpDirectory(serverId, currentDirectory);
      showToast("File deleted", "success");
    } catch {
      showToast("Error deleting file", "error");
    }
  };

  const deleteSftpFolder = async (folder, serverId, currentDirectory = "/") => {
    try {
      await apiRequest("/sftp/api/delete-folder", {
        method: "POST",
        body: JSON.stringify({ currentDirectory, serverId, deleteDir: folder }),
      });
      await changeSftpDirectory(serverId, currentDirectory);
      showToast("Folder deleted", "success");
    } catch {
      showToast("Error deleting folder", "error");
    }
  };

  const createSftpFolder = async (folder, serverId, currentDirectory = "/") => {
    try {
      await apiRequest("/sftp/api/create-folder", {
        method: "POST",
        body: JSON.stringify({
          currentPath: currentDirectory,
          serverId,
          folderName: folder,
        }),
      });
      await changeSftpDirectory(serverId, currentDirectory);
      showToast("Folder created", "success");
    } catch {
      showToast("Error creating folder", "error");
    }
  };

  const renameSftpFile = async (
    currentDirectory,
    serverId,
    fileName,
    newFileName
  ) => {
    try {
      await apiRequest("/sftp/api/renameFile", {
        method: "POST",
        body: JSON.stringify({
          currentPath: currentDirectory,
          fileName,
          newFileName,
          serverId,
        }),
      });
      await changeSftpDirectory(serverId, currentDirectory);
      showToast("File renamed", "success");
    } catch {
      showToast("Error renaming file", "error");
    }
  };

  const shareSftpFile = async (filename, serverId, filepath) => {
    const remotePath = `${filepath}/${filename}`;
    try {
      await apiRequest("/sftp/api/sharefile", {
        method: "POST",
        body: JSON.stringify({ serverId, remotePath }),
      });
      showToast("File shared", "success");
    } catch {
      showToast("Error sharing file", "error");
    }
  };

  const handleSftpFileCopy = async (
    filename,
    currentPath,
    newPath,
    serverId,
    newServerId,
    transferId
  ) => {
    const isCrossServer = serverId !== newServerId;
    const body = {
      filename,
      currentPath,
      newPath,
      serverId,
      ...(isCrossServer && { newServerId, transferId }),
    };

    try {
      await apiRequest("/sftp/api/copy-file", {
        method: "POST",
        body: JSON.stringify(body),
      });
      await changeSftpDirectory(newServerId, newPath);
      showToast("File copied", "success");
    } catch {
      showToast("Error copying file", "error");
    }
  };

  const downloadSftpFile = async (filename, serverId, currentDirectory) => {
    try {
      const blob = await apiRequest(
        `/sftp/api/download/${serverId}/${currentDirectory}/${filename}`,
        {},
        true
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast("Error downloading file", "error");
    }
  };

  const downloadFolder = async (currentDirectory, foldername, serverId) => {
    try {
      const folder = `${currentDirectory}/${foldername}`;
      const blob = await apiRequest(
        `/sftp/api/download-folder/${serverId}/${folder}`,
        {},
        true
      );

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${foldername}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showToast("Folder downloaded", "success");
    } catch {
      showToast("Error downloading folder", "error");
    }
  };

  const connectToServer = async (serverId) => {
    try {
      const data = await apiRequest(`/sftp/api/connect/${serverId}/`);
      setFiles(data);
    } catch {
      showToast("Error connecting to server", "error");
    }
  };

  const changeSftpDirectory = async (serverId, directory) => {
    try {
      const data = await apiRequest(
        `/sftp/api/connect/${serverId}//${directory}/`
      );
      setFiles(data);
    } catch {
      showToast("Error listing directory", "error");
    }
  };

  /**
   * Breadcrumbs
   */
  const generateBreadcrumb = (path) => {
    const parts = path.split("/").filter(Boolean);
    let currentPath = "";
    const breadcrumbs = parts.map((part) => {
      currentPath += `/${part}`;
      return { name: part, path: currentPath };
    });
    return [{ name: "Home", path: "/" }, ...breadcrumbs];
  };

  return {
    deleteSftpFile,
    deleteSftpFolder,
    createSftpFolder,
    renameSftpFile,
    shareSftpFile,
    handleSftpFileCopy,
    downloadSftpFile,
    downloadFolder,
    connectToServer,
    changeSftpDirectory,
    generateBreadcrumb,
  };
};

export default SftpController;
