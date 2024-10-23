import React from "react";
import {
  Box,
  HStack,
  Text,
  Button,
  Icon,
  useColorModeValue,
} from "@chakra-ui/react";
import { FcFolder } from "react-icons/fc";

const FolderList = ({ folders, rp, onFolderClick, handleDeleteFolder }) => {
  const bgg = useColorModeValue("white", "gray.800");
  const hvr = useColorModeValue("gray.50", "gray.700");
  return (
    <Box bg={bgg}>
      {folders &&
        folders.length > 0 &&
        folders.map((folder, index) => (
          <Box
            key={index}
            p={4}
            borderWidth="1px"
            borderRadius="lg"
            bg={"bgg"}
            transition="all 0.2s"
            onClick={() => onFolderClick(folder.name)}
            _hover={{ shadow: "xl", bg: hvr, cursor: "pointer" }}
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
    </Box>
  );
};

export default FolderList;