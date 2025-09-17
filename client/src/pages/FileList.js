import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  useBreakpointValue,
  Spinner,
  Text,
  Button,
  useColorModeValue,
} from "@chakra-ui/react";
import FileListPane from "./fileListPane";
import Upload from "../components/UploadComponent";
import { Link } from "react-router-dom";
import DragAndDropComponent from "../components/DragDropComponent";
import { useFileList } from "../hooks/useFileList";

const FileList = ({ toast }) => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const { fileData, setCurrentPath, loading, handleFolderClick, reload } =
    useFileList();

  const bgg = useColorModeValue("white", "gray.700");
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

        <Box align="center">
          <Link to="/api/sftp">
            <Button colorScheme="blue" mb={6} size="lg" variant="outline">
              Go to SFTP Servers
            </Button>
          </Link>

          {/* Upload Area */}
          <Box mb={8}>
            {isMobile ? (
              <Upload
                apiEndpoint={"/api/upload"}
                additionalData={{ folderPath: fileData.relativePath }}
                onUploadSuccess={reload}
              />
            ) : (
              <DragAndDropComponent
                apiEndpoint={"/api/upload"}
                additionalData={{ folderPath: fileData.relativePath }}
                onUploadSuccess={reload}
              />
            )}
          </Box>
        </Box>

        {/* File List Pane */}
        <Box bg={bgg} boxShadow="md" p={{ base: 1, md: 6 }} borderRadius="md">
          <FileListPane
            data={fileData}
            onFolderClick={handleFolderClick}
            onRefresh={reload}
            toast={toast}
            handleBreadcrumbClick={setCurrentPath}
          />
        </Box>
      </Container>
    </Box>
  );
};

export default FileList;
