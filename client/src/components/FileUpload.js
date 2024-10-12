import React, { useState } from "react";
import Upload from "./Upload";

function FileUpload({ relativePath, refreshPath, toast }) {
  const [file, setFile] = useState(null);
  const token = localStorage.getItem("token");
  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };
  const currentPath = "/";
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file) {
      alert("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append("folderPath", relativePath);
    formData.append("files", file);
    console.log("curp" + currentPath);
    try {
      const response = await fetch("/api/upload", {
        headers: {
          Authorization: `Bearer ${token}`, // Add your token
        },
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "File Uploaded",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        refreshPath(relativePath);
      } else {
        alert("File upload failed");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  return (
   <Upload handleFileChange={handleFileChange} handleSubmit={handleSubmit}/>
  );
}

export default FileUpload;
