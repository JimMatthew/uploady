import { useState } from "react";

function useDragDropUpload({ postUrl, token, toast }) {
  const [uploadProgress, setProgresses] = useState(0);

  const uploadFile = (files, additionalData = {}) => {
    const uploadPromises = files.map((file, index) => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/upload", true);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
  
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentComplete = (event.loaded / event.total) * 100;
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
  
          const singleFileFormData = new FormData();
          Object.keys(additionalData).forEach((key) => {
            formData.append(key, additionalData[key]);
          });
          singleFileFormData.append("files", file);
  
          xhr.send(singleFileFormData);
        });
      });
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      const path = additionalData[currentDirectory] ?
        additionalData[currentDirectory] 
        : additionalData[folderPath]

      //Object.keys(additionalData).forEach((key) => {
      //  formData.append(key, additionalData[key]);
     // });
      //files.forEach((file) => {
       // formData.append("files", file);
      //});
      
      

      
    });
  };

  return { uploadProgress, uploadFile };
}
