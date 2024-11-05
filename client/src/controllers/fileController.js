const FileController = ({ toast, onRefresh }) => {
  const token = localStorage.getItem("token");

  const apiRequest = async (url, options = {}) => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
      if (!response.ok) throw new Error("Request failed");
      return response.json();
    } catch (error) {
      console.error("API error:", error);
      throw error;
    }
  };

  const handleFileDownload = async (fileName, path) => {
    try {
      const response = await fetch(`/api/download/${path}/${fileName}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  const handleFileDelete = async (fileName, path) => {
    try {
      await apiRequest(`/api/delete/${path}/${fileName}`, {
        method: "POST",
        body: JSON.stringify({ fileName }),
      });
      onRefresh(path);
      toast({
        title: "File Deleted",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch {
      toast({
        title: "Error deleting file",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleFileShareLink = async (fileName, filePath) => {
    try {
      await apiRequest(`/api/share`, {
        method: "POST",
        body: JSON.stringify({ fileName, filePath }),
      });
      onRefresh();
      toast({
        title: "Link generated",
        description: `Share link created for ${fileName}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch {
      toast({
        title: "Error generating link",
        description: `Failed to generate link for ${fileName}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteFolder = async (folderName, path) => {
    try {
      await apiRequest(`/api/delete-folder`, {
        method: "POST",
        body: JSON.stringify({ folderName, folderPath: path }),
      });
      onRefresh(path);
      toast({
        title: "Folder Deleted",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch {
      toast({
        title: "Error deleting folder",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const generateBreadcrumb = (path) => {
    const breadcrumbs = [{ name: "Home", path: "files" }];
    let currentPath = "files";
    path.split("/").filter(Boolean).forEach((part) => {
      currentPath += `/${part}`;
      breadcrumbs.push({ name: part, path: currentPath });
    });
    return breadcrumbs;
  };

  const createFolder = async (folderName, currentPath) => {
    try {
      await apiRequest("/api/create-folder", {
        method: "POST",
        body: JSON.stringify({ folderName, currentPath }),
      });
      toast({
        title: "Folder Created",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      onRefresh(currentPath);
    } catch {
      toast({
        title: "Error creating folder",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return {
    handleFileDownload,
    handleFileDelete,
    handleFileShareLink,
    handleDeleteFolder,
    generateBreadcrumb,
    createFolder,
  };
};

export default FileController;