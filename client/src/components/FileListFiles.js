import React, { useState, useEffect } from "react";
import {
  Box,
  HStack,
  Text,
  Button,
  Icon,
  VStack,
  Stack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Input,
} from "@chakra-ui/react";
import { FcFile } from "react-icons/fc";
import { useClipboard } from "../contexts/ClipboardContext";
import ClipboardComponent from "./ClipboardComponent";
const FileList = ({
  files,
  rp,
  handleFileDownload,
  handleFileShareLink,
  handleFileDelete,
  handleFileCopy,
  handleFileCut,
  handleRenameFile
}) => {
  const { copyFile, cutFile, clipboard, clearClipboard } = useClipboard();
const [showRenameInput, setShowRenameInput] = useState(false);
  const [newFilename, setNewFilename] = useState("");
  const [renameId, setRenameId] = useState("");
  const handleCopy = (filename) => {
    copyFile({ file: filename, path: rp, source: "local", serverId: null });
  };

  const handleCut = (filename) => {
    cutFile({ file: filename, path: rp, source: "local", serverId: null });
  };

  const handleRename = (filename) => {
    handleRenameFile(filename, newFilename, rp);
    setShowRenameInput(false);
    setNewFilename("");
  }

  const handlePaste = () => {
    const file = clipboard.file;
    const path = clipboard.path;
    if (clipboard.action === "copy") {
      handleFileCopy(file, path, rp);
    } else if (clipboard.action === "cut") {
      handleFileCut(file, path, rp);
    }
    clearClipboard();
  };
  return (
    <Box>
      {clipboard && (
        <ClipboardComponent
          handlePaste={handlePaste}
        />
      )}
      {files &&
        files.length > 0 &&
        files.map((file, index) => (
          <Box
            key={index}
            p={4}
            borderWidth="1px"
            borderRadius="lg"
            transition="all 0.2s"
          >
            <HStack justify="space-between" align="center">
              <VStack align="start" spacing={1}>
                <HStack>
                  <Icon as={FcFile} boxSize={6} />
                  <Text fontWeight="semibold" fontSize="lg" isTruncated>
                    {file.name}
                  </Text>
                </HStack>
                <Text fontSize="sm" color="gray.500">
                  {file.size} KB | {file.date}
                </Text>
              </VStack>
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
                <MenuButton as={Button}> Actions</MenuButton>
                <MenuList>
                  <MenuItem onClick={() => handleCopy(file.name, rp)}>
                    Copy
                  </MenuItem>
                  <MenuItem onClick={() => handleCut(file.name, rp)}>
                    Cut
                  </MenuItem>
                  <MenuItem onClick={() => handleFileDownload(file.name, rp)}>
                    Download
                  </MenuItem>
                  <MenuItem onClick={() => handleFileShareLink(file.name, rp)}>
                    Share
                  </MenuItem>
                  <MenuItem onClick={() => {
                      setShowRenameInput(true);
                      setRenameId(file.name);
                    }}>
                    Rename
                  </MenuItem>
                  <MenuItem onClick={() => handleFileDelete(file.name, rp)}>
                    Delete
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </Box>
        ))}
    </Box>
  );
};

export default FileList;
