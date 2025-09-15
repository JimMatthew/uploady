import { Box } from "@chakra-ui/react";
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

  const handleShare = () => {
    selected.forEach((file) => {
      handleFileShareLink(file)
    })
    setSelected(new Set())
  }

  const { clipboard } = useClipboard();
  return (
    <Box p={1}>
      
      <Toolbar
        selected={selected}
        handleCopy={handleCopy}
        handleDelete={handleDelete}
        handleClear={() => setSelected(new Set())}
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
          file={file}
          onRenameConfirm={(newName) => {
            handleRenameFile(file.name, newName);
          }}
          onCopy={() => handleFileCopy(file.name)}
          onCut={() => handleFileCut(file.name)}
          onDownload={() => handleFileDownload(file.name)}
          onShare={() => handleFileShareLink(file.name)}
          onDelete={() => handleFileDelete(file.name)}
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
