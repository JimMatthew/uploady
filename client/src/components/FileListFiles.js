import React from "react";
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
const FileList = ({
  files,
  rp,
  handleFileDownload,
  handleFileShareLink,
  handleFileDelete,
  handleFileCopy
}) => {
  const { copyFile, clipboard, clearClipboard } = useClipboard();
  const handleCopy = (filename) => {
    copyFile({file: filename, path: rp, source: "local", serverId: null })
  }

  const handlePaste = () => {
    const file = clipboard.file;
    const path = clipboard.path;
    handleFileCopy(file, path, rp);
    clearClipboard();
  }
  return (
    <Box>
      {clipboard && <Box>
        <HStack>
        <Text>Copied: {clipboard.file}</Text>
        <Button size="sm" onClick={handlePaste}>
          Paste
        </Button>
        <Button size="sm" onClick={clearClipboard}>
          Clear
        </Button>
        </HStack>
        
        </Box>}
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
              <Menu>
                <MenuButton as={Button}> Actions</MenuButton>
                <MenuList>
                  <MenuItem onClick={() => handleCopy(file.name, rp)}>
                    Copy
                  </MenuItem>
                  <MenuItem onClick={() => handleFileDownload(file.name, rp)}>
                    Download
                  </MenuItem>
                  <MenuItem onClick={() => handleFileShareLink(file.name, rp)}>
                    Share
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
