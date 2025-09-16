import React, { useState, useMemo, useCallback } from "react";
import { Box } from "@chakra-ui/react";
import SortComponent from "./SortComponent";
import FolderItem from "./FolderItem";
const FolderList = ({
  folders,
  changeDirectory,
  deleteFolder,
  downloadFolder,
  handleCopy,
}) => {
  const [folderSortDirection, setFolderSortDirection] = useState("asc");

  const toggleFolderSort = useCallback(() => {
    setFolderSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  }, []);

  const asc = useCallback((a, b) => a.name.localeCompare(b.name), []);
  const desc = useCallback((a, b) => b.name.localeCompare(a.name), []);

  const sortedfolders = useMemo(() => {
    return [...folders].sort(folderSortDirection === "asc" ? asc : desc);
  }, [folders, folderSortDirection, asc, desc]);

  return (
    <Box mb={8}>
      <SortComponent
        header="folders"
        onToggle={toggleFolderSort}
        sortDirection={folderSortDirection}
      />
      <Box>
        {sortedfolders.map((folder) => (
          <FolderItem
            key={folder.name}
            folder={folder.name}
            changeDirectory={changeDirectory}
            {...(handleCopy && { handleCopy: handleCopy })}
            {...(downloadFolder && {
              downloadFolder: downloadFolder,
            })}
            deleteFolder={deleteFolder}
          />
        ))}
      </Box>
    </Box>
  );
};

export default FolderList;
