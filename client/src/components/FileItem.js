import {
  Box,
  HStack,
  VStack,
  Text,
  Button,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  useColorModeValue,
} from "@chakra-ui/react";
import { FcFile } from "react-icons/fc";
import RenameComponent from "./RenameComponent";

export default function FileItem({
  file,
  isRenaming,
  onRenameConfirm,
  onRenameCancel,
  onCopy,
  onCut,
  onDownload,
  onShare,
  onDelete,
  onStartRename,
  onOpenFile,
  isSelected,
  onSelect,
}) {
  const bg = useColorModeValue("gray.50", "gray.800");
  const hoverBg = useColorModeValue("gray.100", "gray.600");
  const selectedBg = useColorModeValue("blue.100", "gray.700");
  return (
    <Box
      p={3}
      borderWidth="1px"
      borderRadius="lg"
      transition="all 0.2s"
      bg={isSelected ? selectedBg : bg}
      cursor="pointer"
      onClick={onSelect}
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

        {isRenaming ? (
          <RenameComponent
            handleRename={(name) => onRenameConfirm(name)}
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
              {onOpenFile && (
                <MenuItem onClick={onOpenFile}> Open File</MenuItem>
              )}
            </MenuList>
          </Menu>
        )}
      </HStack>
    </Box>
  );
}
