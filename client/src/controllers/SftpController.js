import { useNavigate } from "react-router-dom";

const SftpController = ({ toast, setFiles }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const deleteSftpFile = async (
    filename,
    serverId,
    currentDirectory,
  ) => {
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
    }
    changeSftpDirectory(serverId, cd);
    toast({
      title: "File Deleted.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const deleteSftpFolder = async (
    folder,
    serverId,
    currentDirectory,
  ) => {
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
    }
    changeSftpDirectory(serverId, cd);
    toast({
      title: "Folder Deleted.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const createSftpFolder = async (
    folder,
    serverId,
    currentDirectory,
  ) => {
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
    }
    changeSftpDirectory(serverId, cd);
    toast({
      title: "Folder Created.",
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
  };
};

export default SftpController;
