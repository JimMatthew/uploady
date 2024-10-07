
const FileController = ({ toast,  onRefresh })=> {
    const token = localStorage.getItem("token");
     const handleFileDownload = (fileName, path) => {
        
        fetch(`/api/download/${path}/${fileName}`, {
          headers: {
            Authorization: `Bearer ${token}`, // Add your token
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
      return {handleFileDownload, handleFileDelete}
}

export default FileController

  