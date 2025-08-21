import { Box, HStack, VStack, Text, Button, Icon, Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react";
import { FcFile } from "react-icons/fc";
import RenameFileComponent from "./RenameFileComponent";

export default function FileItem({
  file,
  isRenaming,
  newFilename,
  onRenameInput,
  onRenameConfirm,
  onRenameCancel,
  onCopy,
  onCut,
  onDownload,
  onShare,
  onDelete,
  onStartRename,
}) {
  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" transition="all 0.2s">
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

        {isRenaming ? (
          <RenameFileComponent
            newFilename={newFilename}
            onInput={onRenameInput}
            handleRename={onRenameConfirm}
            onCancel={onRenameCancel}
          />
        ) : (
          <Menu>
            <MenuButton as={Button}>Actions</MenuButton>
            <MenuList>
              <MenuItem onClick={onCopy}>Copy</MenuItem>
              <MenuItem onClick={onCut}>Cut</MenuItem>
              <MenuItem onClick={onDownload}>Download</MenuItem>
              <MenuItem onClick={onShare}>Share</MenuItem>
              <MenuItem onClick={onStartRename}>Rename</MenuItem>
              <MenuItem onClick={onDelete}>Delete</MenuItem>
            </MenuList>
          </Menu>
        )}
      </HStack>
    </Box>
  );
}