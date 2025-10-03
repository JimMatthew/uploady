import React, { useMemo, useCallback } from "react";
import { Box, Container, Spinner, Text, Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { useFileList } from "../hooks/useFileList";
import FilePanel from "./FilePanel";

const FileList = ({ toast, hideLink = false, openFile }) => {
  const {
    fileData,
    setCurrentPath,
    loading,
    handleFolderClick,
    reload,
    onCreateFolder,
    onFileCopy,
    onFileCut,
    onFileDelete,
    onFileDownload,
    onFileRename,
    onFileShare,
    onFolderCopy,
    onFolderDelete,
    onPaste,
    onGenerateBreadcrumb,
  } = useFileList({ toast });

  const token = localStorage.getItem("token");
  const fileUploadProps = useMemo(
    () => ({
      apiEndpoint: "/api/upload",
      additionalData: { folderPath: fileData?.relativePath },
      onUploadSuccess: reload,
    }),
    [fileData?.relativePath, reload]
  );

  const onOpenFile = (filename) => {
    openFile(null, fileData.relativePath, filename, null, false);
  };

  const apiRequest = useCallback(
    async (url, options = {}, expectBlob = false) => {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...options.headers,
          },
        });

        if (response.status === 401) {
          //navigate("/");
          throw new Error("Unauthorized");
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Request failed");
        }

        return expectBlob ? response.blob() : response.json();
      } catch (error) {
        console.error("API error:", error);
        throw error;
      }
    },
    []
  );

  const downloadFileBlob = useCallback((blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }, []);

  const handleDownloadFolder = async (foldername) => {
    try {
      const folder = `${fileData.relativePath}/${foldername}`;
      const blob = await apiRequest(`/api/download-folder/${folder}`, {}, true);
      downloadFileBlob(blob, `${foldername}.zip`);
      //showToast("Folder downloaded", "success");
    } catch {
      //showToast("Error downloading folder", "error");
    }
  };

  if (loading || !fileData)
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="lg" />
        <Text mt={2}>Loading...</Text>
      </Box>
    );

  return (
    <Box as="main" minH="80vh" py={8}>
      <Container maxW="container.lg">
        {/* Link to SFTP Servers */}
        {!hideLink && (
          <Box align="center">
            <Link to="/api/sftp">
              <Button colorScheme="blue" mb={6} size="lg" variant="outline">
                Go to SFTP Servers
              </Button>
            </Link>
          </Box>
        )}
        <FilePanel
          files={fileData}
          handleDownload={onFileDownload}
          onChangeDirectory={handleFolderClick}
          onDeleteFolder={onFolderDelete}
          handleDelete={onFileDelete}
          handleShare={onFileShare}
          handleRename={onFileRename}
          handleCopy={onFileCopy}
          handleCut={onFileCut}
          handlePaste={onPaste}
          changeDirectory={setCurrentPath}
          onCreateFolder={onCreateFolder}
          generateBreadcrumb={onGenerateBreadcrumb}
          onFolderCopy={onFolderCopy}
          fileUploadProps={fileUploadProps}
          onOpenFile={onOpenFile}
          handleDownloadFolder={handleDownloadFolder}
        />
      </Container>
    </Box>
  );
};

export default FileList;
