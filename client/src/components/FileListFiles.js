import {
  Box,
  Button,
} from "@chakra-ui/react";
import { useFileList } from "../hooks/useFileListFile";
import FileItem from "./FileItem";
import ClipboardComponent from "./ClipboardComponent";
import PickSortComponent from "./PickSortComponent";
import Toolbar from "./Toolbar";
import { useClipboard } from "../contexts/ClipboardContext";
import { useState, useMemo, useCallback } from "react";
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
  const [renamingFile, setRenamingFile] = useState(null);
  const { clipboard } = useClipboard();
  
  const [contextMenu, setContextMenu] = useState({
    x: 0,
    y: 0,
    file: null,
    visible: false,
  });

  const openMenu = (e, fileName) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      file: fileName,
      visible: true,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ ...contextMenu, visible: false });
  };

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
          onRename={(name, newName) => {
            handleRenameFile(name, newName);
            setRenamingFile(null);
          }}
          onRenameClose={() => setRenamingFile(null)}
        />
      ))}

      {contextMenu.visible && (
        <Box
          position="fixed"
          top={contextMenu.y}
          left={contextMenu.x}
          bg="grey.700"
          borderWidth="1px"
          borderRadius="md"
          shadow="lg"
          zIndex={9999}
          onMouseLeave={closeContextMenu}
        >
          <Button
            onClick={() => {
              handleFileCopy(contextMenu.file);
              closeContextMenu();
            }}
          >
            Copy
          </Button>
          <Button
            onClick={() => {
              handleFileCut(contextMenu.file);
              closeContextMenu();
            }}
          >
            Cut
          </Button>
          <Button
            onClick={() => {
              handleFileDelete(contextMenu.file);
              closeContextMenu();
            }}
          >
            Delete
          </Button>
          <Button
            onClick={() => {
              handleFileDownload(contextMenu.file);
              closeContextMenu();
            }}
          >
            Download
          </Button>
          <Button
            onClick={() => {
              handleFileShareLink(contextMenu.file);
              closeContextMenu();
            }}
          >
            Share
          </Button>
          <Button
            onClick={() => {
              setRenamingFile(contextMenu.file);
              closeContextMenu();
            }}
          >
            Rename
          </Button>
          {handleOpenFile && (
            <Button 
              onClick={() => {
                handleOpenFile(contextMenu.file);
                closeContextMenu()
              }}
            >Open</Button>
          )}
        </Box>
      )}
    </Box>
  );
}
