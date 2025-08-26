import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  HStack,
  Text,
  Button,
  Icon,
  useColorModeValue,
} from "@chakra-ui/react";
import { FcFolder } from "react-icons/fc";
import SortComponent from "./SortComponent";
import FolderItem from "./FolderItem";
const FolderList = ({ folders, rp, onFolderClick, handleDeleteFolder }) => {
  const bgg = useColorModeValue("white", "gray.800");
  const hvr = useColorModeValue("gray.50", "gray.700");
  const [folderSortDirection, setFolderSortDirection] = useState("asc");

  const toggleFolderSort = () =>
    setFolderSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));

  const sortedfolders = useMemo(() => {
    return [...folders].sort((a, b) =>
      folderSortDirection === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );
  }, [folders, folderSortDirection]);

  return (
    <Box bg={bgg}>
      <SortComponent
        header="folders"
        onToggle={toggleFolderSort}
        sortDirection={folderSortDirection}
      />
      {sortedfolders &&
        sortedfolders.length > 0 &&
        sortedfolders.map((folder, index) => (
          
           <FolderItem 
           folder={folder}
           changeDirectory={() => onFolderClick(folder.name)}
           deleteFolder={() => handleDeleteFolder(folder.name, rp)}
           />
          
        ))}
    </Box>
  );
};

export default FolderList;
