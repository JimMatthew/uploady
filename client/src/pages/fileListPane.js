import React, { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Tooltip,
  useToast,
  HStack,
  Input
} from "@chakra-ui/react";

const FileDisplay = ({ data, onFolderClick }) => {
  const { files, folders, breadcrumb, currentPath, user, relativePath } = data;
  const token = localStorage.getItem("token");
  const toast = useToast()
  const rp = '/'+relativePath
  const handleShareLink = (fileName) => {
    fetch(`/api/share`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fileName, filePath: rp }),
    })
      .then((res) => res.json())
      .then((data) => {
        
        toast({
          title: "Link generated.",
          description: `Share link created for ${fileName}`,
          status: "success",
          duration: 3000,
          isClosable: true,
        })
      })
      .catch((err) => {
        toast({
          title: "Error",
          description: `Failed to generate link for ${fileName}`,
          status: "error",
          duration: 3000,
          isClosable: true,
        })
      })
    }



  const handleDownload = (fileName) => {
    fetch(`/api/download/${currentPath}/${fileName}`, {
      headers: {
        Authorization: `Bearer ${token}`, // Add your token
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((error) => console.error("Download error:", error));
    }
  const handleDelete = (fileName) => {
    fetch(`/api/delete/${rp}/${fileName}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({  fileName: fileName }),
      
    })
      .then((res) => res.json())
      .then((data) => {
        
        toast({
          title: "File Deleted.",
          status: "success",
          duration: 3000,
          isClosable: true,
        })
      })
      .catch((err) => {
        toast({
          title: "Error",
          status: "error",
          duration: 3000,
          isClosable: true,
        })
      })
  }
  
  return (
    <Box>
      <Box mt={4} borderWidth="1px" borderRadius="lg" p={4}>
        <Heading as="h2" size="md" mb={4}>
          <HStack justify={"space-between"} >
          <Text>Contents of {currentPath}</Text>
          <Box>
          <Input size={"sm"}htmlSize={6} width='auto' margin={"5px"}></Input>
          <Button> New Folder</Button>
          </Box>
          
          </HStack>
          
        </Heading>

        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Size (KB)</Th>
              <Th>Date Modified</Th>
            </Tr>
          </Thead>
          <Tbody>
            {/* Folders */}
            {folders.map((folder, index) => (
              <Tr
                key={index}
                onClick={() => onFolderClick(folder.name)}
                style={{ cursor: "pointer" }}
              >
                <Td>
                  <Text as="span" mr={2}>
                    📁
                  </Text>
                  {folder.name}
                </Td>
                <Td>--</Td>
                <Td>--</Td>
              </Tr>
            ))}

            {/* Files */}
            {files.map((file, index) => (
              <Tr key={index}>
                <Td>
                  <Text as="span" mr={2}>
                    📄
                  </Text>
                  {file.name}
                </Td>
                <Td>{file.size}</Td>
                <Td>{file.date}</Td>
                <Td>
                  <Button size="sm" margin="2px"onClick={() => handleDownload(file.name)}>
                    Download
                  </Button>
                  <Button size="sm" margin="2px"onClick={() => handleShareLink(file.name)}>
                    Share
                  </Button>
                  <Button size="sm" margin="2px"onClick={() => handleDelete(file.name)}>
                    Delete
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};

export default FileDisplay;
