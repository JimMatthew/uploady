import { Box } from "@chakra-ui/react";
import { useFileList } from "../hooks/useFileListFile";
import FileItem from "./FileItem";
import ClipboardComponent from "./ClipboardComponent";
import PickSortComponent from "./PickSortComponent";
import Toolbar from "./Toolbar";
import { useClipboard } from "../contexts/ClipboardContext";
import { useState, useCallback } from "react";

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
    toggleFileSort
  } = useFileList({
    files,
    handleFileCopy,
    handleFileDelete,
    handleFileShareLink,
  });

  const { clipboard } = useClipboard();

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
          onRenameConfirm={handleRenameFile}
          onCopy={handleFileCopy}
          onCut={handleFileCut}
          onDownload={handleFileDownload}
          onShare={handleFileShareLink}
          onDelete={handleFileDelete}
          onOpenFile={handleOpenFile ? handleOpenFile : undefined}
          isSelected={isSelected(file.name)}
          onSelect={toggleSelect}
        />
      ))}
    </Box>
  );
}
