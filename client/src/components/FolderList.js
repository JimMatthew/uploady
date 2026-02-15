import React, { useState, useMemo, useCallback } from "react";
import { Box } from "@chakra-ui/react";
import SortComponent from "./SortComponent";
import FolderItem from "./FolderItem";
import FileMenu from "./FileMenu";
const FolderList = ({
  folders,
  changeDirectory,
  deleteFolder,
  downloadFolder,
  handleCopy,
}) => {
  const [folderSortDirection, setFolderSortDirection] = useState("asc");
  const [contextMenu, setContextMenu] = useState({
    x: 0,
    y: 0,
    file: null,
    visible: false,
  });

  const openMenu = useCallback((e, fileName) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      file: fileName,
      visible: true,
    });
  }, []);

  const closeContextMenu = () => {
    setContextMenu({ ...contextMenu, visible: false });
  };
  
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
            onOpenMenu={openMenu}
          />
        ))}
      </Box>
      {contextMenu.visible && (
        <FileMenu
          file={contextMenu.file}
          top={contextMenu.y}
          left={contextMenu.x}
          closeMenu={closeContextMenu}
          handleFileCopy={handleCopy}
          handleFileDelete={deleteFolder}
          handleFileDownload={downloadFolder}
        />
      )}
    </Box>
  );
};

export default FolderList;
