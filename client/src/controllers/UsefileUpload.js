import { useState } from "react";

export function useFileUpload({ postUrl, token, toast }) {
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = (file, additionalData = {}) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      

      Object.keys(additionalData).forEach((key) => {
        formData.append(key, additionalData[key]);
      });
      formData.append("files", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", postUrl, true);
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          toast({
            title: "Upload successful",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
          setUploadProgress(0);
          resolve(xhr.response);
        } else {
          toast({
            title: "Upload failed",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          reject(new Error("Upload failed"));
        }
      };

      xhr.onerror = () => {
        toast?.({
          title: "Upload error",
          description: "An error occurred while uploading the file.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        reject(new Error("Upload error"));
      };

      xhr.send(formData);
    });
  };

  return { uploadProgress, uploadFile };
}
