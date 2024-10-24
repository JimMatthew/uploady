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
import SharedLinks from "../components/SharedLinks";
import FileUpload from "../components/FileUpload2";
import { Link } from "react-router-dom";
import DragAndDropUpload from "../components/DragDrop";
import { useNavigate } from "react-router-dom";

const FileList = ({ setUser, toast }) => {
  const [fileData, setFileData] = useState(null);
  const [fileTrie, setFileTrie] = useState({});
  const [currentPath, setCurrentPath] = useState("files");
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState([]);
  const isMobile = useBreakpointValue({ base: true, md: false });
  const navigate = useNavigate();

  const updateTrie = (path, files, folders) => {
    setFileData(files);
    setFileTrie((fileTrie) => {
      const paths = path.split("/").filter(Boolean);
      let currentNode = { ...fileTrie };

      let node = currentNode;
      paths.forEach((segment) => {
        if (!node[segment]) node[segment] = { files: [], folders: {} };
        node = node[segment].folders;
      });

      if (files) node.files = files;
      if (folders)
        node.folders = folders.reduce((acc, folder) => {
          acc[folder.name] = { folders: {} };
          return acc;
        }, {});
      return currentNode;
    });
  };

  const getFolderFromTrie = (path) => {
    const paths = path.split("/").filter(Boolean);
    let currentNode = fileTrie;

    for (const segment of paths) {
      if (!currentNode[segment]) {
        return null;
      }
      currentNode = currentNode[segment].folders;
    }
    return currentNode;
  };

  useEffect(() => {
    if (token) {
      fetchFiles(currentPath);
      setLoading(false);
    } else {
      navigate("/");
      console.error("No token found");
    }
  }, [currentPath, token]);

  const handleFolderClick = (folderName) => {
    setCurrentPath((prevPath) => `${prevPath}/${folderName}`);
  };

  const reload = () => {
    fetchLinks();
    fetchFiles(currentPath);
  };

  const fetchLinks = () => {
    fetch("/api/links", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setLinks(data.links);
      })
      .catch((err) => {
        console.error("Error fetching shared links", err);
      });
  };

  const fetchFiles = async (path) => {
    setLoading(true);
    const existingFolder = getFolderFromTrie(path);

    if (existingFolder) {
      setFileData(existingFolder.files);
      setLoading(false);
    }

    try {
      const response = await fetch(`/api/${path}/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        navigate("/");
        return;
      }

      const data = await response.json();

      updateTrie(path, data);
    } catch (err) {
      console.error("Error fetching files:", err);
    } finally {
      setLoading(false);
    }
  };
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
              <FileUpload
                relativePath={fileData.relativePath}
                refreshPath={reload}
                toast={toast}
              />
            ) : (
              <DragAndDropUpload
                relativePath={fileData.relativePath}
                refreshPath={reload}
                toast={toast}
              />
            )}
          </Box>
        </Box>

        {/* Shared Links Section */}
        <Box mb={8} bg={bgg} boxShadow="sm" p={6} borderRadius="md">
          <SharedLinks onReload={fetchLinks} links={links} />
        </Box>

        {/* File List Pane */}
        <Box bg={bgg} boxShadow="md" p={6} borderRadius="md">
          <FileListPane
            data={fileData}
            onFolderClick={handleFolderClick}
            onRefresh={reload}
            toast={toast}
            files={fileData.files}
            folders={fileData.folders}
            handleBreadcrumbClick={setCurrentPath}
          />
        </Box>
      </Container>
    </Box>
  );
};

export default FileList;
