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
} from "@chakra-ui/react";

const FileDisplay = ({ data, onFolderClick }) => {
  const { files, folders, breadcrumb, currentPath, user } = data;
  const token = localStorage.getItem("token");

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
  };
  return (
    <Box>
      <Box mt={4} borderWidth="1px" borderRadius="lg" p={4}>
        <Heading as="h2" size="md" mb={4}>
          Contents of {currentPath}
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
                  <Button size="sm" onClick={() => handleDownload(file.name)}>
                    Download
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
