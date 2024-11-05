const FileController = ({ toast, onRefresh }) => {
  const token = localStorage.getItem("token");
  const handleFileDownload = (fileName, path) => {
    fetch(`/api/download/${path}/${fileName}`, {
      headers: {
        Authorization: `Bearer ${token}`, 
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((error) => console.error("Download error:", error));
  };

  const handleFileDelete = (fileName, path) => {
    fetch(`/api/delete/${path}/${fileName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fileName: fileName }),
    })
      .then((res) => res.json())
      .then((data) => {
        onRefresh(path);
        toast({
          title: "File Deleted.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      })
      .catch((err) => {
        toast({
          title: "Error",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      });
  };

  const handleFileShareLink = (fileName, filePath) => {
    fetch(`/api/share`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fileName, filePath }),
    })
      .then((res) => res.json())
      .then((data) => {
        onRefresh();
        toast({
          title: "Link generated.",
          description: `Share link created for ${fileName}`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      })
      .catch((err) => {
        toast({
          title: "Error",
          description: `Failed to generate link for ${fileName}`,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      });
  };

  const handleDeleteFolder = (folderName, path) => {
    fetch(`/api/delete-folder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        folderName: folderName,
        folderPath: path,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        onRefresh(path);
        toast({
          title: "Folder Deleted.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      })
      .catch((err) => {
        toast({
          title: "Error",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      });
  };

  const generateBreadcrumb = (path) => {
    const breadcrumbs = [];
    let currentPath = `files`;
    const pathParts = path.split("/").filter(Boolean);
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      breadcrumbs.push({
        name: part,
        path: currentPath,
      });
    });
    breadcrumbs.unshift({ name: "Home", path: `files` });
    return breadcrumbs;
  };

  const createFolder = async (folderName, currentPath) => {

    try {
      const response = await fetch("/api/create-folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ folderName, currentPath }),
      });

      if (response.ok) {
        toast({
          title: "Folder Created",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        onRefresh(currentPath);
      } else {
        toast({
          title: "Error creating folder",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error creating folder",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  }


  return {
    handleFileDownload,
    handleFileDelete,
    handleFileShareLink,
    handleDeleteFolder,
    generateBreadcrumb,
    createFolder
  };
};

export default FileController;
