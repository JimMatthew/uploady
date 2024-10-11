import React, { useEffect, useState } from "react";
import { Box, Flex, Text, Container, Center, useToast } from "@chakra-ui/react";
import axios from "axios";
import Breadcrum from "./Breadcrumbs";
import FileListPane from "./fileListPane";
import SharedLinks from "./SharedLinks";
import FileUpload from "./FileUpload";
import { Link } from "react-router-dom";

const FileList = ({setUser, toast}) => {
  const [fileData, setFileData] = useState(null);
  const [fileTrie, setFileTrie] = useState({})
  const [currentPath, setCurrentPath] = useState("/files");
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState([]);
  
  const updateTrie = (path, files, folders) => {
    setFileTrie((fileTrie) => {
      const paths = path.split("/").filter(Boolean)
      let currentNode = { ...fileTrie}

      let node = currentNode
      paths.forEach((segment) => {
        if (!node[segment]) {
          node[segment] = { files: [], folders: [] }
        }
        node = node[segment].folders
      })

      node.files = files
      node.folders = folders.reduce((acc, folder) => {
        acc[folder.name] = { files: [], folders: {} }
        return acc
      }, {})
      return currentNode
    })
  }

  const getFolderFromTrie = (path) => {
    const paths = path.split("/").filter(Boolean)
    let currentNode = fileTrie

    for (const segment of paths) {
      if (!currentNode[segment]) {
        return null
      }
      currentNode = currentNode[segment].folders
    }

    return currentNode
  }

  useEffect(() => {
    if (token) {
      fetchFiles(currentPath);
      if (fileData) {
        setUser(fileData.user.username)
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

  const fetchFiles = (path) => {
    setLoading(true);
    const existingFolder = getFolderFromTrie(path)

    if (existingFolder) {
      console.log(existingFolder)
    }
    fetch(`/api/${path}/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {setFileData(data),updateTrie(path, data.files, data.folders)})
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
        <FileUpload relativePath={fileData.relativePath} refreshPath={reload} toast={toast} />
        
        <SharedLinks onReload={fetchLinks} links={links} />
        
        <Breadcrum
          breadcrumb={fileData.breadcrumb}
          onClick={handleBreadcrumbClick}
        />

        <FileListPane
          data={fileData}
          onFolderClick={handleFolderClick}
          onRefresh={reload}
          toast={toast}
          files={fileData.files}
          folders={fileData.folders}
        />
      </Container>
      
    </div>
  );
};

export default FileList;
