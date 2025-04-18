import { useNavigate } from "react-router-dom";

const SftpController = ({ toast, setFiles }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const deleteSftpFile = async (filename, serverId, currentDirectory) => {
    const cd = currentDirectory ? currentDirectory : "/";
    const response = await fetch("/sftp/api/delete-file", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        currentDirectory: cd,
        serverId: serverId,
        fileName: filename,
      }),
    });
    if (!response.ok) {
      toast({
        title: "Error Deleting File",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    changeSftpDirectory(serverId, cd);
    toast({
      title: "File Deleted.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const connectToServer = async (serverId) => {
    try {
      const response = await fetch(`/sftp/api/connect/${serverId}/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error("Failed to connect to the server:", error);
    }
  };

  const downloadFolder = async (currentDirectory, foldername, serverId) => {
    try {
      const folder = `${currentDirectory}/${foldername}`;
      const res = await fetch(
        `/sftp/api/download-folder/${serverId}/${folder}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        toast({
          title: "Error Downloading folder",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${foldername}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Folder Downloaded",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Error Downloading folder",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
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
      const response = await fetch("/sftp/api/copy-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(body),
      });
  
      if (!response.ok) throw new Error();
  
      changeSftpDirectory(newServerId, newPath);
  
      toast({
        title: "File copied",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Error copying file",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const renameSftpFile = async (
    currentDirectory,
    serverId,
    fileName,
    newFileName
  ) => {
    const response = await fetch("/sftp/api/renameFile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        currentPath: currentDirectory,
        fileName,
        newFileName,
        serverId,
      }),
    });
    if (!response.ok) {
      toast({
        title: "Error Renaming file",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    changeSftpDirectory(serverId, currentDirectory);
    toast({
      title: "File renamed",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const deleteSftpFolder = async (folder, serverId, currentDirectory) => {
    const cd = currentDirectory ? currentDirectory : "/";
    const response = await fetch("/sftp/api/delete-folder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        currentDirectory: cd,
        serverId: serverId,
        deleteDir: folder,
      }),
    });
    if (!response.ok) {
      toast({
        title: "Error Deleting File",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    changeSftpDirectory(serverId, cd);
    toast({
      title: "Folder Deleted.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const createSftpFolder = async (folder, serverId, currentDirectory) => {
    const cd = currentDirectory ? currentDirectory : "/";
    const response = await fetch("/sftp/api/create-folder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        currentPath: cd,
        serverId: serverId,
        folderName: folder,
      }),
    });
    if (!response.ok) {
      toast({
        title: "Error Creating Folder",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    changeSftpDirectory(serverId, cd);
    toast({
      title: "Folder Created.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const shareSftpFile = async (filename, serverId, filepath) => {
    const remotePath = `${filepath}/${filename}`;
    const response = await fetch("/sftp/api/sharefile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        serverId: serverId,
        remotePath: remotePath,
      }),
    });
    if (!response.ok) {
      toast({
        title: "Error Sharing file",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    toast({
      title: "File shared",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const downloadSftpFile = (filename, serverId, currentDirectory) => {
    fetch(`/sftp/api/download/${serverId}/${currentDirectory}/${filename}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((error) => console.error("Download error:", error));
  };

  const generateBreadcrumb = (path) => {
    const breadcrumbs = [];
    let currentPath = ``;
    const pathParts = path.split("/").filter(Boolean);
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      breadcrumbs.push({
        name: part,
        path: currentPath,
      });
    });
    breadcrumbs.unshift({ name: "Home", path: `/` });
    return breadcrumbs;
  };

  const changeSftpDirectory = async (serverId, directory) => {
    try {
      if (!token) {
        navigate("/");
        return;
      }
      const response = await fetch(
        `/sftp/api/connect/${serverId}//${directory}/`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.status === 401) {
        navigate("/");
        return;
      }
      if (!response.ok) {
        toast({
          title: "Error Listing Directory",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      toast({
        title: "Error Listing Directory",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return {
    deleteSftpFile,
    downloadSftpFile,
    deleteSftpFolder,
    createSftpFolder,
    generateBreadcrumb,
    changeSftpDirectory,
    shareSftpFile,
    renameSftpFile,
    downloadFolder,
    connectToServer,
    handleSftpFileCopy,
  };
};

export default SftpController;
