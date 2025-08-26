import React, { useState, useMemo } from "react";
import {
  Box,
  useColorModeValue,
} from "@chakra-ui/react";
import SortComponent from "./SortComponent";
import FolderItem from "./FolderItem";
const FolderList = ({
  folders,
  changeDirectory,
  deleteFolder,
  downloadFolder,
  handleCopy
}) => {
  const [folderSortDirection, setFolderSortDirection] = useState("asc");
  const bgg = useColorModeValue("gray.50", "gray.600");

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
    <Box mb={8}>
      <SortComponent
        header="folders"
        onToggle={toggleFolderSort}
        sortDirection={folderSortDirection}
      />
      <Box>
        {sortedfolders.map((folder, index) => (
          <FolderItem 
            folder={folder}
            changeDirectory={() => changeDirectory(folder.name)}
            handleCopy={() => handleCopy(folder.name)}
            downloadFolder={() => downloadFolder(folder.name)}
            deleteFolder={() => deleteFolder(folder.name)}
          />
        ))}
      </Box>
    </Box>
  );
};

export default FolderList;
