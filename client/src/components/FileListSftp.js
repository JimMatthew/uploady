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
import { useClipboard } from "../contexts/ClipboardContext";
import ClipboardComponent from "./ClipboardComponent";
import RenameFileComponent from "./RenameFileComponent";
import PickSortComponent from "./PickSortComponent";
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
  const [showRenameInput, setShowRenameInput] = useState(false);
  const [newFilename, setNewFilename] = useState("");
  const [renameId, setRenameId] = useState("");
  const [fileSortDirection, setFileSortDirection] = useState("asc");
  const [sortField, setSortField] = useState("name");
  const bgg = useColorModeValue("gray.50", "gray.600");
  const { clipboard } = useClipboard();

  const handleRename = (filename) => {
    renameFile(filename, newFilename);
    setShowRenameInput(false);
    setNewFilename("");
  };

  const toggleFileSort = () =>
    setFileSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));

  const sortedfiles = useMemo(() => {
    if (sortField === "size") {
      return [...files].sort((a, b) =>
        fileSortDirection === "asc" ? a.size - b.size : b.size - a.size
      );
    } else if (sortField === "date") {
      return [...files].sort((a, b) =>
        fileSortDirection === "asc"
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date)
      );
    }
    return [...files].sort((a, b) =>
      fileSortDirection === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );
  }, [files, fileSortDirection, sortField]);
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
