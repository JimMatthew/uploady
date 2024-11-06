import { useState } from "react";
import { useToast } from "@chakra-ui/react";

const useFileUpload2 = ({ apiEndpoint, token, additionalData = {} }) => {
  const [progresses, setProgresses] = useState([]);
  const toast = useToast();

  const uploadFiles = async (files, onUploadSuccess, onUploadError) => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to upload",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const uploadPromises = files.map((file, index) => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", apiEndpoint, true);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded * 100) / event.total);
            setProgresses((prevProgresses) => {
              const newProgresses = [...prevProgresses];
              newProgresses[index] = percentComplete;
              return newProgresses;
            });
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error("Upload failed"));
          }
        };

        xhr.onerror = () => {
          reject(new Error("An error occurred while uploading the file."));
        };

        const formData = new FormData();
        formData.append("files", file);
        for (const key in additionalData) {
          formData.append(key, additionalData[key]);
        }

        xhr.send(formData);
      });
    });

    try {
      await Promise.all(uploadPromises);
      toast({
        title: "Files Uploaded",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      onUploadSuccess?.();
      setProgresses([]);
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: "Error",
        description: "An error occurred while uploading files",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      onUploadError?.(error);
    }
  };

  return { uploadFiles, progresses };
};

export default useFileUpload2;