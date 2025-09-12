import { Box, Button, Text, HStack } from "@chakra-ui/react";
import { useFileList } from "../hooks/useFileListFile";
import FileItem from "./FileItem";
import ClipboardComponent from "./ClipboardComponent";
import PickSortComponent from "./PickSortComponent";
import Toolbar from "./Toolbar";
import { useClipboard } from "../contexts/ClipboardContext";
import { useState } from "react";
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
    showRenameInput,
    setShowRenameInput,
    renameId,
    setRenameId,
    fileSortDirection,
    setFileSortDirection,
    sortField,
    setSortField,
  } = useFileList({ files });
  const [selected, setSelected] = useState(new Set());

  const toggleSelect = (fileName) => {
    setSelected((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileName)) {
        newSet.delete(fileName);
      } else {
        newSet.add(fileName);
      }
      return newSet;
    });
  };

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

  const handleClear = () => {
    selected(new Set())
  }

  const { clipboard } = useClipboard();
  return (
    <Box p={1}>
      
      <Toolbar
        selected={selected}
        handleCopy={handleCopy}
        handleDelete={handleDelete}
        handleClear={handleClear}
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
          file={file}
          isRenaming={showRenameInput && renameId === file.name}
          onRenameConfirm={(newName) => {
            handleRenameFile(file.name, newName);
            setShowRenameInput(false);
          }}
          onRenameCancel={() => setShowRenameInput(false)}
          onCopy={() => handleFileCopy(file.name)}
          onCut={() => handleFileCut(file.name)}
          onDownload={() => handleFileDownload(file.name)}
          onShare={() => handleFileShareLink(file.name)}
          onDelete={() => handleFileDelete(file.name)}
          onStartRename={() => {
            setShowRenameInput(true);
            setRenameId(file.name);
          }}
          {...(handleOpenFile && {
            onOpenFile: () => handleOpenFile(file.name),
          })}
          isSelected={selected.has(file.name)}
          onSelect={() => toggleSelect(file.name)}
        />
      ))}
    </Box>
  );
}
