import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  IconButton,
  Heading,
  HStack,
  Button,
  useColorModeValue,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Input,
} from "@chakra-ui/react";
import { FaEdit, FaFolder, FaFile, FaDownload, FaTrash } from "react-icons/fa";

const FileList = ({
  files,
  downloadFile,
  deleteFile,
  openFile,
  shareFile,
  renameFile,
}) => {
  const [showRenameInput, setShowRenameInput] = useState(false);
  const [newFilename, setNewFilename] = useState("");
  const [renameId, setRenameId] = useState("");
  const bgg = useColorModeValue("gray.50", "gray.600");

  const handleRename = (filename) => {
    renameFile(filename, newFilename);
    setShowRenameInput(false);
    setNewFilename("");
  };
  return (
    <Box>
      <Heading size="md" mb={4} color="gray.600">
        Files
      </Heading>
      <Box>
        {files.map((file, index) => (
          <HStack
            key={index}
            justify="space-between"
            p={4}
            borderWidth="1px"
            borderRadius="md"
            _hover={{ bg: bgg }}
            transition="background-color 0.2s"
          >
            <HStack spacing={2}>
              <FaFile size={24} />
              <Text fontWeight="medium">{file.name}</Text>
            </HStack>
            <Text color="gray.500" fontSize="sm">
              {file.size} KB
            </Text>
            <HStack spacing={2}>
              {showRenameInput && renameId && renameId === file.name && (
                <Box>
                  <HStack>
                    <Input
                      placeholder="New filename"
                      value={newFilename}
                      onChange={(e) => setNewFilename(e.target.value)}
                      size="sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(file.name);
                      }}
                    />
                    <Button size="sm" onClick={() => handleRename(file.name)}>
                      submit
                    </Button>
                    <Button size="sm" onClick={() => setShowRenameInput(false)}>
                      cancel
                    </Button>
                  </HStack>
                </Box>
              )}
              <Menu>
                <MenuButton as={Button}> Actions </MenuButton>
                <MenuList>
                  <MenuItem onClick={() => downloadFile(file.name)}>
                    Download
                  </MenuItem>
                  <MenuItem onClick={() => shareFile(file.name)}>
                    Share
                  </MenuItem>
                  <MenuItem onClick={() => openFile(file.name)}>Open</MenuItem>
                  <MenuItem
                    onClick={() => {
                      setShowRenameInput(true);
                      setRenameId(file.name);
                    }}
                  >
                    Rename
                  </MenuItem>
                  <MenuItem onClick={() => deleteFile(file.name)}>
                    Delete
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </HStack>
        ))}
      </Box>
    </Box>
  );
};

export default FileList;
