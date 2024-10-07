const SftpController = ({toast}) => {
    const token = localStorage.getItem("token");
    const deleteSftpFile = async (filename, serverId, currentDirectory, changeDirectory) => {
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
        changeDirectory(cd);
        toast({
          title: "File Deleted.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      };

      const downloadSftpFile = (filename, serverId, currentDirectory) => {
        
        fetch(`/sftp/api/download/${serverId}/${currentDirectory}/${filename}`, {
          headers: {
            Authorization: `Bearer ${token}`, // Add your token
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
      return { deleteSftpFile, downloadSftpFile }
}

export default SftpController