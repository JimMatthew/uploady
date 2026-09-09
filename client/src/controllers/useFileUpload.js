import { useState } from "react";
import { useToast } from "@chakra-ui/react";

const useFileUpload = ({ apiEndpoint, token, additionalData = {} }) => {
  const [progresses, setProgresses] = useState([]);
  const toast = useToast();

  const uploadFile = (file, index) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open("POST", apiEndpoint, true);

      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          return;
        }

        const progress = Math.round((event.loaded / event.total) * 100);

        setProgresses((current) => {
          const next = [...current];
          next[index] = progress;
          return next;
        });
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setProgresses((current) => {
            const next = [...current];
            next[index] = 100;
            return next;
          });

          resolve();
          return;
        }

        let message = `Upload failed (${xhr.status})`;

        try {
          const response = JSON.parse(xhr.responseText);

          if (response?.message) {
            message = response.message;
          } else if (response?.error) {
            message = response.error;
          }
        } catch {
          // Response was not JSON.
        }

        reject(new Error(message));
      };

      xhr.onerror = () => {
        reject(new Error(`Network error while uploading ${file.name}`));
      };

      xhr.onabort = () => {
        reject(new Error(`Upload cancelled: ${file.name}`));
      };

      const formData = new FormData();

      Object.entries(additionalData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      formData.append("files", file);

      xhr.send(formData);
    });
  };

  const uploadFiles = async (files, onUploadSuccess, onUploadError) => {
    if (!files?.length) {
      toast({
        title: "No files selected",
        description: "Please select files to upload",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });

      return;
    }

    setProgresses(Array(files.length).fill(0));

    try {
      await Promise.all(files.map((file, index) => uploadFile(file, index)));

      toast({
        title: files.length === 1 ? "File uploaded" : "Files uploaded",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      onUploadSuccess?.();
      setProgresses([]);
    } catch (error) {
      console.error("Error uploading files:", error);

      toast({
        title: "Upload failed",
        description: error.message || "An error occurred while uploading files",
        status: "error",
        duration: 3000,
        isClosable: true,
      });

      onUploadError?.(error);
      setProgresses([]);

      throw error;
    }
  };

  return {
    uploadFiles,
    progresses,
  };
};

export default useFileUpload;
