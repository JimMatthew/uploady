import { Box } from "@chakra-ui/react";
import { useFileList } from "../hooks/useFileListFile";
import FileItem from "./FileItem";
import ClipboardComponent from "./ClipboardComponent";
import PickSortComponent from "./PickSortComponent";

export default function FileList(props) {
  const {
    sortedFiles,
    clipboard,
    showRenameInput,
    setShowRenameInput,
    newFilename,
    setNewFilename,
    renameId,
    setRenameId,
    fileSortDirection,
    setFileSortDirection,
    sortField,
    setSortField,
    handleCopy,
    handleCut,
    handleRename,
    handlePaste,
  } = useFileList(props.files, props.rp, props);

  return (
    <Box>
      {clipboard[0] && <ClipboardComponent handlePaste={handlePaste} />}

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
          newFilename={newFilename}
          onRenameInput={setNewFilename}
          onRenameConfirm={() => handleRename(file.name)}
          onRenameCancel={() => setShowRenameInput(false)}
          onCopy={() => handleCopy(file.name)}
          onCut={() => handleCut(file.name)}
          onDownload={() => props.handleFileDownload(file.name, props.rp)}
          onShare={() => props.handleFileShareLink(file.name, props.rp)}
          onDelete={() => props.handleFileDelete(file.name, props.rp)}
          onStartRename={() => {
            setShowRenameInput(true);
            setRenameId(file.name);
          }}
        />
      ))}
    </Box>
  );
}