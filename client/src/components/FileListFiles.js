import { Box } from "@chakra-ui/react";
import { useFileList } from "../hooks/useFileListFile";
import FileItem from "./FileItem";
import ClipboardComponent from "./ClipboardComponent";
import PickSortComponent from "./PickSortComponent";
import { useClipboard } from "../contexts/ClipboardContext";
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
    newFilename,
    setNewFilename,
    renameId,
    setRenameId,
    fileSortDirection,
    setFileSortDirection,
    sortField,
    setSortField,
  } = useFileList({ files });

  const { clipboard } = useClipboard();
  return (
    <Box>
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
          newFilename={newFilename}
          onRenameInput={setNewFilename}
          onRenameConfirm={() => {
            handleRenameFile(file.name, newFilename);
            setShowRenameInput(false);
            setNewFilename("");
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
        />
      ))}
    </Box>
  );
}
