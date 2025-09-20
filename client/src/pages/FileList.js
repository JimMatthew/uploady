import React, { useMemo } from "react";
import { Box, Container, Spinner, Text, Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { useFileList } from "../hooks/useFileList";
import FilePanel from "./FilePanel";

const FileList = ({ toast, hideLink = false }) => {
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

  const fileUploadProps = useMemo(
    () => ({
      apiEndpoint: "/api/upload",
      additionalData: { folderPath: fileData?.relativePath },
      onUploadSuccess: reload,
    }),
    [fileData?.relativePath, reload]
  );

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
        />
      </Container>
    </Box>
  );
};

export default FileList;
