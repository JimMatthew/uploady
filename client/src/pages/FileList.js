import React, { useEffect, useState } from "react";
import { Box, Flex, Text, Container } from "@chakra-ui/react";
import axios from "axios";
import Header from "./Header";
import Breadcrum from "./Breadcrumbs";
import FileListPane from "./fileListPane";
import SharedLinks from "./SharedLinks";
import FileUpload from "./FileUpload"
const FileList = () => {
  const [fileData, setFileData] = useState(null);
  const [currentPath, setCurrentPath] = useState("/files");
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (token) {
      fetchFiles(currentPath);
    } else {
      console.error("No token found");
    }
  }, [currentPath, token]);

  const handleFolderClick = (folderName) => {
    setCurrentPath((prevPath) => `${prevPath}/${folderName}`); // Update the path
  };

  const handleBreadcrumbClick = (path) => {
    setCurrentPath(path);
  };

  const fetchFiles = (path) => {
    fetch(`/api/${path}/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => setFileData(data))
      .catch((err) => console.error("Error fetching files:", err));
  };
  if (!fileData) return <div>Loading...</div>;

  return (
    <div>
      {/* Render file and folder list */}
      <Header username={fileData.user.username} />

      <Container maxW="container.lg" mt={4}>
        <FileUpload relativePath={fileData.relativePath} refreshPath={fetchFiles}/>
      <SharedLinks />
        <Breadcrum
          breadcrumb={fileData.breadcrumb}
          onClick={handleBreadcrumbClick}
        />
        
        <FileListPane data={fileData} onFolderClick={handleFolderClick} />
      </Container>
      <Flex as="footer" bg="gray.200" p={4} mt={10} justify="center">
        <Text>© 2024 File Manager by James Lindstrom</Text>
      </Flex>
    </div>
  );
};

export default FileList;
