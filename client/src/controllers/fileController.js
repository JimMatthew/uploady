
export const handleFileDownload = (fileName, path) => {
    const token = localStorage.getItem("token");
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

  