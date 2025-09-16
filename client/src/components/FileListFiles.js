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
    setFileSortDirection,
    sortField,
    setSortField,
  } = useFileList({ files });
  const [selected, setSelected] = useState(new Set());

  const toggleSelect = useCallback((fileName) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fileName)) {
        next.delete(fileName);
      } else {
        next.add(fileName);
      }
      return next;
    });
  }, []);

  const handleCopy = () => {
    selected.forEach((file) => {
      handleFileCopy(file);
    });
    setSelected(new Set());
  };

  const handleDelete = () => {
    selected.forEach((file) => {
      handleFileDelete(file);
    });
    setSelected(new Set());
  };

  const handleShare = () => {
    selected.forEach((file) => {
      handleFileShareLink(file);
    });
    setSelected(new Set());
  };

  const isSelected = (fileName) => selected.has(fileName);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

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
        onToggleDirection={() =>
          setFileSortDirection((d) => (d === "asc" ? "desc" : "asc"))
        }
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
