import React, { useMemo, useCallback } from "react";
import { Box, Flex, Text, Icon, Spinner } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { FiServer, FiArrowRight } from "react-icons/fi";
import { useFileList } from "../hooks/useFileList";
import FilePanel from "./FilePanel";

const FileList = ({ toast, hideLink = false, openFile }) => {
  const {
    fileData, setCurrentPath, loading,
    handleFolderClick, reload, onCreateFolder,
    onFileCopy, onFileCut, onFileDelete, onFileDownload,
    onFileRename, onFileShare, onFolderCopy, onFolderDelete,
    onPaste, onGenerateBreadcrumb,
  } = useFileList({ toast });

  const token = localStorage.getItem("token");

  const fileUploadProps = useMemo(() => ({
    apiEndpoint: "/api/upload",
    additionalData: { folderPath: fileData?.relativePath },
    onUploadSuccess: reload,
  }), [fileData?.relativePath, reload]);

  const onOpenFile = (filename) => {
    openFile(null, fileData.relativePath, filename, null, false);
  };

  const apiRequest = useCallback(async (url, options = {}, expectBlob = false) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    if (!res.ok) throw new Error(await res.text() || "Request failed");
    return expectBlob ? res.blob() : res.json();
  }, [token]);

  const downloadFileBlob = useCallback((blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }, []);

  const handleDownloadFolder = async (foldername) => {
    try {
      const blob = await apiRequest(`/api/download-folder/${fileData.relativePath}/${foldername}`, {}, true);
      downloadFileBlob(blob, `${foldername}.zip`);
    } catch {}
  };

  if (loading || !fileData) return (
    <Flex align="center" justify="center" h="300px" direction="column" gap={3}>
      <Spinner size="sm" color="rgba(99,102,241,0.6)" />
      <Text fontSize="12px" color="rgba(255,255,255,0.25)">Loading files…</Text>
    </Flex>
  );

  return (
    <Box minH="80vh">
      {/* SFTP link banner */}
      {!hideLink && (
        <Flex
          align="center" justify="space-between"
          mx={{ base: 3, md: 5 }}
          mt={4} mb={2}
          px={4} py={3}
          borderRadius="9px"
          bg="rgba(99,102,241,0.06)"
          border="1px solid rgba(99,102,241,0.15)"
        >
          <Flex align="center" gap={2}>
            <Icon as={FiServer} boxSize="14px" color="rgba(99,102,241,0.7)" />
            <Text fontSize="12px" color="rgba(255,255,255,0.45)">
              Manage remote SFTP servers
            </Text>
          </Flex>
          <Link to="/api/sftp">
            <Flex
              align="center" gap={1}
              fontSize="12px" fontWeight={600}
              color="#818CF8"
              _hover={{ color: "#A5B4FC" }}
              transition="color 0.12s"
            >
              SFTP Servers
              <Icon as={FiArrowRight} boxSize="12px" />
            </Flex>
          </Link>
        </Flex>
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
    </Box>
  );
};

export default FileList;