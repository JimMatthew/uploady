import React, { useEffect, useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Breadcrumb,
  List,
  ListItem,
  BreadcrumbItem,
  BreadcrumbLink,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Container,
  Spacer,
  Button,
  Spinner,
} from "@chakra-ui/react";

const FileDisplay = ({ data, onFolderClick }) => {
    const { files, folders, breadcrumb, currentPath, user } = data;
  
    return (
      <Box>
        {/* Breadcrumb */}
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
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Box>
    );
  };

export default FileDisplay