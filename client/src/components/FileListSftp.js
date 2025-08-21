import React, { useState, useMemo } from "react";
import {
  Box,
  Text,
  HStack,
  Icon,
  Button,
  useColorModeValue,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from "@chakra-ui/react";
import { FaFile } from "react-icons/fa";
import ClipboardComponent from "./ClipboardComponent";
import RenameFileComponent from "./RenameFileComponent";
import PickSortComponent from "./PickSortComponent";
import { useSftpFileList } from "../hooks/useSftpFileList";
const FileList = ({
  files,
  downloadFile,
  deleteFile,
  openFile,
  shareFile,
  renameFile,
  handleCopy,
  handleCut,
  handlePaste,
}) => {

  const {
    showRenameInput,
    setShowRenameInput,
    newFilename,
    setNewFilename,
    renameId,
    setRenameId,
    fileSortDirection,
    sortField,
    setSortField,
    clipboard,
    toggleFileSort,
    handleRename,
    sortedfiles
  } = useSftpFileList({ files, renameFile });
  const bgg = useColorModeValue("gray.50", "gray.600");

  return (
    <Box>
      {clipboard[0] && <ClipboardComponent handlePaste={handlePaste} />}

      <PickSortComponent
        header="files"
        fields={["name", "size", "date"]}
        sortDirection={fileSortDirection}
        onToggleDirection={toggleFileSort}
        onFieldChange={(field) => setSortField(field)}
        selectedField={sortField}
      />
      <Box>
        {sortedfiles.map((file, index) => (
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
              <HStack align="start" spacing={1}>
                <Icon as={FaFile} boxSize={6} />
                <Text fontWeight="semibold" fontSize="lg" isTruncated>
                  {file.name}
                </Text>
              </HStack>
            </HStack>

            <HStack spacing={2}>
              {showRenameInput && renameId && renameId === file.name && (
                <RenameFileComponent
                  newFilename={newFilename}
                  onInput={(input) => setNewFilename(input)}
                  handleRename={() => handleRename(file.name)}
                  onCancel={() => setShowRenameInput(false)}
                />
              )}
              <Text fontSize="sm" color="gray.500" marginRight="50px">
                {file.size} KB | {file.date}
              </Text>
              <Menu>
                <MenuButton as={Button}> Actions </MenuButton>
                <MenuList>
                  <MenuItem onClick={() => handleCopy(file.name)}>
                    Copy
                  </MenuItem>
                  <MenuItem onClick={() => handleCut(file.name)}>Cut</MenuItem>
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
