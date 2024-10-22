import React, { useState } from "react";
import Upload from "./Upload";
import { Progress } from "@chakra-ui/react"; // Assuming you're using Chakra UI

function FileUpload({ relativePath, refreshPath, toast }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0); // Track the upload progress
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

    // Create a new XMLHttpRequest for file upload with progress tracking
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload", true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    // Update progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        setProgress(percentComplete); // Update progress bar
      }
    };

    // Handle response
    xhr.onload = () => {
      if (xhr.status === 200) {
        toast({
          title: "File Uploaded",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        refreshPath(relativePath);
        setProgress(0); // Reset progress
      } else {
        alert("File upload failed");
      }
    };

    // Handle error
    xhr.onerror = () => {
      alert("An error occurred while uploading the file.");
    };

    // Send the form data
    xhr.send(formData);
  };

  return (
    <div>
      <Upload handleFileChange={handleFileChange} handleSubmit={handleSubmit} />
      {file && (
        <Progress
        textAlign="left"
          value={progress}
          size="md"
          colorScheme="green"
          mt={4}
          hasStripe
          isAnimated
        />
      )}
    </div>
  );
}

export default FileUpload;