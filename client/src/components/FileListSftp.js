import React, { useState, useMemo } from "react";
import { Box, useColorModeValue } from "@chakra-ui/react";
import ClipboardComponent from "./ClipboardComponent";
import PickSortComponent from "./PickSortComponent";
import { useSftpFileList } from "../hooks/useSftpFileList";
import FileItem from "./FileItem";
const FileList = ({
  files,
  downloadFile,
  deleteFile,
  openFile,
  shareFile,
  renameFile,
  handleCopy,
  handleCut,
  handlePaste,
}) => {
  const {
    showRenameInput,
    setShowRenameInput,
    newFilename,
    setNewFilename,
    renameId,
    setRenameId,
    fileSortDirection,
    sortField,
    setSortField,
    clipboard,
    toggleFileSort,
    handleRename,
    sortedfiles,
  } = useSftpFileList({ files, renameFile });
  const bgg = useColorModeValue("gray.50", "gray.600");

  return (
    <Box>
      {clipboard[0] && <ClipboardComponent handlePaste={handlePaste} />}

      <PickSortComponent
        header="files"
        fields={["name", "size", "date"]}
        sortDirection={fileSortDirection}
        onToggleDirection={toggleFileSort}
        onFieldChange={(field) => setSortField(field)}
        selectedField={sortField}
      />
      <Box>
        {sortedfiles.map((file) => (
          <FileItem
            key={file.name}
            file={file}
            isRenaming={showRenameInput && renameId === file.name}
            newFilename={newFilename}
            onRenameInput={setNewFilename}
            onRenameConfirm={() => handleRename(file.name)}
            onRenameCancel={() => setShowRenameInput(false)}
            onCopy={() => handleCopy(file.name)}
            onCut={() => handleCut(file.name)}
            onDownload={() => downloadFile(file.name)}
            onShare={() => shareFile(file.name)}
            onDelete={() => deleteFile(file.name)}
            onStartRename={() => {
              setShowRenameInput(true);
              setRenameId(file.name);
            }}
            onOpenFile={() => openFile(file.name)}
          />
        ))}
      </Box>
    </Box>
  );
};

export default FileList;
