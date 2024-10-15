import React from "react";
import { Box, HStack, Text, Button, Icon } from "@chakra-ui/react";
import { FcFolder } from "react-icons/fc";

const FolderList = ({ folders, rp, onFolderClick, handleDeleteFolder }) => {
  return (
    <>
      {folders && folders.length > 0 && folders.map((folder, index) => (
        <Box
          key={index}
          p={4}
          borderWidth="1px"
          borderRadius="lg"
          _hover={{ shadow: "xl", bg: "gray.50", cursor: "pointer" }}
          transition="all 0.2s"
          onClick={() => onFolderClick(folder.name)}
        >
          <HStack justify="space-between" align="center">
            <HStack>
              <Icon as={FcFolder} boxSize={6} />
              <Text fontWeight="semibold" fontSize="lg" isTruncated>
                {folder.name}
              </Text>
            </HStack>
            <HStack spacing={4}>
              <Text fontSize="sm" color="gray.500">
                Folder
              </Text>
              <Button
                size="sm"
                colorScheme="red"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent clicking folder
                  handleDeleteFolder(folder.name, rp);
                }}
              >
                Delete
              </Button>
            </HStack>
          </HStack>
        </Box>
      ))}
    </>
  );
};

export default FolderList;