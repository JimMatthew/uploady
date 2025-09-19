import React, { useState, useMemo } from "react";
import {
  Text,
  HStack,
  useColorModeValue,
  Icon,
} from "@chakra-ui/react";
import { FcFolder } from "react-icons/fc";

const FolderItem = React.memo(function FolderItem({
  folder,
  changeDirectory,
  onOpenMenu
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
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenMenu(e, folder);
      }}
    >
      <HStack spacing={2}>
        <Icon as={FcFolder} boxSize={6} />
        <Text fontWeight="medium">{folder}</Text>
      </HStack>
    </HStack>
  );
})

export default FolderItem
