import React, { useState, useMemo } from "react";
import {
  Text,
  IconButton,
  HStack,
  useColorModeValue,
  Icon,
  Button,
} from "@chakra-ui/react";
import { FaTrash, FaDownload } from "react-icons/fa";
import { FcFolder } from "react-icons/fc";

const FolderItem = React.memo(function FolderItem({
  folder,
  changeDirectory,
  handleCopy,
  downloadFolder,
  deleteFolder,
}) {
  const bgg = useColorModeValue("gray.50", "gray.600");
  return (
    <HStack
      justify="space-between"
      p={4}
      borderWidth="1px"
      borderRadius="md"
      _hover={{ bg: bgg, cursor: "pointer" }}
      onClick={() => changeDirectory(folder)}
    >
      <HStack spacing={2}>
        <Icon as={FcFolder} boxSize={6} />
        <Text fontWeight="medium">{folder}</Text>
      </HStack>
      <HStack spacing={2}>
        {handleCopy && (
          <Button
            size="sm"
            onClick={(e) => {
              handleCopy(folder);
              e.stopPropagation();
            }}
          >
            copy
          </Button>
        )}
        {downloadFolder && (
          <IconButton
            size="sm"
            icon={<FaDownload />}
            aria-label="download Folder"
            onClick={(e) => {
              downloadFolder(folder);
              e.stopPropagation();
            }}
            variant="ghost"
            colorScheme="blue"
          />
        )}

        <IconButton
          size="sm"
          icon={<FaTrash />}
          aria-label="Delete Folder"
          onClick={(e) => {
            deleteFolder(folder);
            e.stopPropagation();
          }}
          variant="ghost"
          colorScheme="red"
        />
      </HStack>
    </HStack>
  );
})

export default FolderItem
