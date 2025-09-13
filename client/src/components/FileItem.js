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
import { useState } from "react";
import RenameComponent from "./RenameComponent";

export default function FileItem({
  file,
  onRenameConfirm,
  onCopy,
  onCut,
  onDownload,
  onShare,
  onDelete,
  onOpenFile,
  isSelected,
  onSelect,
}) {
  const bg = useColorModeValue("gray.50", "gray.800");
  const hoverBg = useColorModeValue("gray.100", "gray.600");
  const selectedBg = useColorModeValue("blue.100", "gray.700");
  const [showRenameInput, setShowRenameInput] = useState(false);

  const StopPropMenuItem = ({ onClick, children, ...props }) => (
    <MenuItem
      {...props}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
    >
      {children}
    </MenuItem>
  );
  return (
    <Box
      p={2}
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

        {showRenameInput ? (
          <RenameComponent
            handleRename={(name) => {
              onRenameConfirm(name);
              setShowRenameInput(false);
            }}
            onCancel={() => setShowRenameInput(false)}
          />
        ) : (
          <Menu>
            <MenuButton as={Button} onClick={(e) => e.stopPropagation()}>
              Actions
            </MenuButton>
            <MenuList>
              <StopPropMenuItem onClick={onCopy}>Copy</StopPropMenuItem>
              <StopPropMenuItem onClick={onCut}>Cut</StopPropMenuItem>
              <StopPropMenuItem onClick={onDownload}>Download</StopPropMenuItem>
              <StopPropMenuItem onClick={onShare}>Share</StopPropMenuItem>
              <StopPropMenuItem onClick={() => setShowRenameInput(true)}>
                Rename
              </StopPropMenuItem>
              <StopPropMenuItem onClick={onDelete}>Delete</StopPropMenuItem>
              {onOpenFile && (
                <StopPropMenuItem onClick={onOpenFile}>
                  Open File
                </StopPropMenuItem>
              )}
            </MenuList>
          </Menu>
        )}
      </HStack>
    </Box>
  );
}
