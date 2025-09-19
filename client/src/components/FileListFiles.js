import { Box } from "@chakra-ui/react";
import { useFileList } from "../hooks/useFileListFile";
import FileItem from "./FileItem";
import ClipboardComponent from "./ClipboardComponent";
import PickSortComponent from "./PickSortComponent";
import Toolbar from "./Toolbar";
import { useClipboard } from "../contexts/ClipboardContext";
import { useState, useCallback } from "react";
import FileMenu from "./FileMenu";
export default function FileList({
  files,
  handleFileDownload,
  handleFileDelete,
  handleFileShareLink,
  handleRenameFile,
  handleFileCopy,
  handleFileCut,
  handleFilePaste,
  handleOpenFile,
}) {
  const {
    sortedFiles,
    fileSortDirection,
    sortField,
    setSortField,
    selected,
    toggleSelect,
    handleCopy,
    handleDelete,
    handleShare,
    isSelected,
    clearSelection,
    toggleFileSort,
  } = useFileList({
    files,
    handleFileCopy,
    handleFileDelete,
    handleFileShareLink,
  });
  const { clipboard } = useClipboard();
  const [renamingFile, setRenamingFile] = useState(null);
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

  const onRename = useCallback((name, newName) => {
    handleRenameFile(name, newName);
    setRenamingFile(null);
  }, []);

  const onRenameCancel = useCallback(() => setRenamingFile(null), []);

  return (
    <Box p={1}>
      <Toolbar
        selected={selected}
        handleCopy={handleCopy}
        handleDelete={handleDelete}
        handleClear={clearSelection}
        handleShare={handleShare}
      />

      {clipboard[0] && <ClipboardComponent handlePaste={handleFilePaste} />}

      <PickSortComponent
        header="files"
        fields={["name", "size", "date"]}
        sortDirection={fileSortDirection}
        onToggleDirection={toggleFileSort}
        onFieldChange={setSortField}
        selectedField={sortField}
      />

      {sortedFiles.map((file) => (
        <FileItem
          key={file.name}
          name={file.name}
          size={file.size}
          date={file.date}
          isSelected={isSelected(file.name)}
          onSelect={toggleSelect}
          onOpenMenu={openMenu}
          isRenaming={renamingFile === file.name}
          onRename={onRename}
          onRenameClose={onRenameCancel}
        />
      ))}

      {contextMenu.visible && (
        <FileMenu
          file={contextMenu.file}
          top={contextMenu.y}
          left={contextMenu.x}
          closeMenu={closeContextMenu}
          handleFileCopy={handleFileCopy}
          handleFileCut={handleFileCut}
          handleFileDelete={handleFileDelete}
          handleFileDownload={handleFileDownload}
          handleFileShareLink={handleFileShareLink}
          handleOpenFile={handleOpenFile}
          setRenamingFile={setRenamingFile}
        />
      )}
    </Box>
  );
}
