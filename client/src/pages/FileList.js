import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  useBreakpointValue,
} from "@chakra-ui/react";
import FileListPane from "./fileListPane";
import SharedLinks from "./SharedLinks";
import FileUpload from "./FileUpload";
import { Link } from "react-router-dom";
import DragAndDropUpload from "./DragDropUpload";

const FileList = ({ setUser, toast }) => {
  const [fileData, setFileData] = useState(null);
  const [fileTrie, setFileTrie] = useState({});
  const [currentPath, setCurrentPath] = useState("/files");
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState([]);
  const isMobile = useBreakpointValue({ base: true, md: false });
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
          acc[folder.name] = { files: [], folders: {} };
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
        return null; // Folder not found
      }
      currentNode = currentNode[segment].folders;
    }
    return currentNode;
  };

  useEffect(() => {
    if (token) {
      fetchFiles(currentPath);
      if (fileData) {
        setUser(fileData.user.username);
      }
    } else {
      console.error("No token found");
    }
  }, [currentPath, token]);

  const handleFolderClick = (folderName) => {
    setCurrentPath((prevPath) => `${prevPath}/${folderName}`);
  };

  const handleBreadcrumbClick = (path) => {
    setCurrentPath(path);
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
    fetch(`/api/${path}/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        updateTrie(path, data);
      })
      .then(setLoading(false))
      .catch((err) => console.error("Error fetching files:", err));
  };
  if (loading || !fileData) return <div>Loading...</div>;

  return (
    <div>
      {/* Render file and folder list */}
      <Link to="/api/sftp">
        <button>Go to SFTP Servers</button>
      </Link>
      <Container maxW="container.lg" mt={4}>
        <Box align="center">
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

        <SharedLinks onReload={fetchLinks} links={links} />

        <FileListPane
          data={fileData}
          onFolderClick={handleFolderClick}
          onRefresh={reload}
          toast={toast}
          files={fileData.files}
          folders={fileData.folders}
          handleBreadcrumbClick={handleBreadcrumbClick}
        />
      </Container>
    </div>
  );
};

export default FileList;
