import React, { useState, useMemo } from "react";
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

  const toggleFolderSort = () =>
    setFolderSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));

  const asc = (a, b) => a.name.localeCompare(b.name);
  const desc = (a, b) => b.name.localeCompare(a.name);

  const sortedfolders = useMemo(() => {
    return [...folders].sort(folderSortDirection === "asc" ? asc : desc);
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
            {...(handleCopy && { handleCopy: () => handleCopy(folder.name) })}
            {...(downloadFolder && {
              downloadFolder: () => downloadFolder(folder.name),
            })}
            deleteFolder={() => deleteFolder(folder.name)}
          />
        ))}
      </Box>
    </Box>
  );
};

export default FolderList;
