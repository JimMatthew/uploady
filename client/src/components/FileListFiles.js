import React, { useState, useEffect, useMemo } from "react";
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
import SortComponent from "./SortComponent";
import RenameFileComponent from "./RenameFileComponent";
const FileList = ({
  files,
  rp,
  handleFileDownload,
  handleFileShareLink,
  handleFileDelete,
  handleFileCopy,
  handleFileCut,
  handleRenameFile,
}) => {
  const { copyFile, cutFile, clipboard, clearClipboard } = useClipboard();
  const [showRenameInput, setShowRenameInput] = useState(false);
  const [newFilename, setNewFilename] = useState("");
  const [renameId, setRenameId] = useState("");
  const [fileSortDirection, setFileSortDirection] = useState("asc");
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
  };

  const toggleFileSort = () =>
    setFileSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));

  const handlePaste = () => {
    const file = clipboard[0].file;
    const path = clipboard[0].path;
    if (clipboard[0].action === "copy") {
      handleFileCopy(file, path, rp);
    } else if (clipboard[0].action === "cut") {
      handleFileCut(file, path, rp);
    }
    clearClipboard();
  };

  const handlePastenum = () => {
    clipboard.forEach(({ file, path, action }) => {
      if (action === "copy") {
        handleFileCopy(file, path, rp);
      } else if (action === "cut") {
        handleFileCut(file, path, rp);
      }
    });
    clearClipboard();
  };

  const sortedfiles = useMemo(() => {
    return [...files].sort((a, b) =>
      fileSortDirection === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );
  }, [files, fileSortDirection]);
  return (
    <Box>
      {clipboard[0] && <ClipboardComponent handlePaste={handlePastenum} />}

      <SortComponent
        header="files"
        onToggle={toggleFileSort}
        sortDirection={fileSortDirection}
      />

      {sortedfiles &&
        sortedfiles.length > 0 &&
        sortedfiles.map((file, index) => (
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
                <RenameFileComponent
                  newFilename={newFilename}
                  onInput={(input) => setNewFilename(input)}
                  handleRename={() => handleRename(file.name)}
                  onCancel={() => setShowRenameInput(false)}
                />
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
                  <MenuItem
                    onClick={() => {
                      setShowRenameInput(true);
                      setRenameId(file.name);
                    }}
                  >
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
