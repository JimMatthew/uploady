import React from "react";
import {
  Box,
  HStack,
  VStack,
  Text,
  Icon,
  useColorModeValue,
} from "@chakra-ui/react";
import { FcFile } from "react-icons/fc";
import RenameComponent from "./RenameComponent";

const FileItem = React.memo(function FileItem({
  name,
  size,
  date,
  isSelected,
  onSelect,
  onOpenMenu,
  isRenaming,
  onRename,
  onRenameClose,
}) {
  const bg = useColorModeValue("gray.50", "gray.800");
  const selectedBg = useColorModeValue("blue.100", "gray.700");

  return (
    <Box
      p={2}
      borderWidth="1px"
      borderRadius="lg"
      transition="all 0.2s"
      bg={isSelected ? selectedBg : bg}
      cursor="pointer"
      onClick={() => onSelect(name)}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenMenu(e, name);
      }}
    >
      <HStack justify="space-between" align="center">
        <VStack align="start" spacing={1}>
          <HStack>
            <Icon as={FcFile} boxSize={6} />
            <Text fontWeight="semibold" fontSize="lg" isTruncated>
              {name}
            </Text>
          </HStack>
          <Text fontSize="sm" color="gray.500">
            {size} KB | {date}
          </Text>
        </VStack>

        {isRenaming && (
          <RenameComponent
            handleRename={(newname) => onRename(name, newname)}
            onCancel={onRenameClose}
          />
        )}
      </HStack>
    </Box>
  );
});

export default FileItem;
