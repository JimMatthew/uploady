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
  const [currentPath, setCurrentPath] = useState("/files");
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState([]);
  

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
    fetch(`/api/${path}/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => setFileData(data))
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
        />
      </Container>
      
    </div>
  );
};

export default FileList;
