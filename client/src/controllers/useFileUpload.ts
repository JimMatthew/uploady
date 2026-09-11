import { useState } from "react";
import { useToast } from "@chakra-ui/react";

interface UseFileUploadOptions {
  apiEndpoint: string;
  token: string | null;
  additionalData?: Record<string, unknown>;
}

interface UseFileUploadResult {
  uploadFiles: (
    files: File[],
    onUploadSuccess?: () => void,
    onUploadError?: (error: Error) => void,
  ) => Promise<void>;

  progresses: number[];
}

interface UploadErrorResponse {
  message?: string;
  error?: string;
}

const useFileUpload = ({
  apiEndpoint,
  token,
  additionalData = {},
}: UseFileUploadOptions): UseFileUploadResult => {
  const [progresses, setProgresses] = useState<number[]>([]);

  const toast = useToast();

  const uploadFile = (file: File, index: number): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open("POST", apiEndpoint, true);

      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event: ProgressEvent<EventTarget>) => {
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
          const response = JSON.parse(xhr.responseText) as UploadErrorResponse;

          if (response.message) {
            message = response.message;
          } else if (response.error) {
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

  const uploadFiles = async (
    files: File[],
    onUploadSuccess?: () => void,
    onUploadError?: (error: Error) => void,
  ): Promise<void> => {
    if (!files.length) {
      toast({
        title: "No files selected",
        description: "Please select files to upload",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });

      return;
    }

    setProgresses(Array.from({ length: files.length }, () => 0));

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
    } catch (error: unknown) {
      console.error("Error uploading files:", error);

      const uploadError =
        error instanceof Error
          ? error
          : new Error("An error occurred while uploading files");

      toast({
        title: "Upload failed",
        description: uploadError.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });

      onUploadError?.(uploadError);

      setProgresses([]);

      throw uploadError;
    }
  };

  return {
    uploadFiles,
    progresses,
  };
};

export default useFileUpload;
