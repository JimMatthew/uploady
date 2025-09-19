import {
  Box,
  Stack,
  Heading,
  useBreakpointValue,
} from "@chakra-ui/react";
import Breadcrumbs from "../components/Breadcrumbs";
import Upload from "../components/UploadComponent";
import DragAndDropComponent from "../components/DragDropComponent";
import CreateFolderComponent from "../components/CreateFolderComponent";
import FolderList from "../components/FolderList";
import FileList from "../components/FileListFiles";
import TransferProgress from "../components/TransferProgress";
const FilePanel = ({
  files,
  handleDownload,
  onChangeDirectory,
  onDeleteFolder,
  handleDownloadFolder,
  onFolderCopy,
  handleDelete,
  handleShare,
  handleRename,
  handleCopy,
  handleCut,
  handlePaste,
  onOpenFile,
  changeDirectory,
  onCreateFolder,
  startedTransfers,
  progressMap,
  generateBreadcrumb,
  fileUploadProps,
}) => {
    const isMobile = useBreakpointValue({ base: true, md: false });
  const { apiEndpoint, additionalData, onUploadSuccess } = fileUploadProps;
  return (
    <Box
      p={{ base: 2, md: 6 }}
      borderWidth="1px"
      borderRadius="md"
      boxShadow="md"
      maxWidth="1200px"
      mx="auto"
    >
      {/* Heading */}
      <Box mb={6}>
        <Box align="center">
          {!isMobile ? (
            <DragAndDropComponent
              apiEndpoint={apiEndpoint}
              additionalData={additionalData}
              onUploadSuccess={onUploadSuccess}
            />
          ) : (
            <Upload
              apiEndpoint={apiEndpoint}
              additionalData={additionalData}
              onUploadSuccess={onUploadSuccess}
            />
          )}
        </Box>

        <Heading size="lg" mb={4} color="gray.700">
          Files and Folders
        </Heading>
      </Box>

      <Box
        p={{ base: 2, md: 6 }}
        borderWidth="1px"
        borderRadius="md"
        boxShadow="md"
        maxWidth="1200px"
        mx="auto"
      >
        {/* Folder Creation and Breadcrumb */}
        <Stack
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          align={{ base: "start", md: "center" }}
          spacing={4}
          mb={6}
        >
          <Breadcrumbs
            breadcrumb={generateBreadcrumb(files.currentDirectory || "/")}
            onClick={changeDirectory}
            color="gray.500"
          />

          <CreateFolderComponent handleCreateFolder={onCreateFolder} />
        </Stack>

        <FolderList
          folders={files.folders}
          changeDirectory={onChangeDirectory}
          deleteFolder={onDeleteFolder}
          downloadFolder={handleDownloadFolder}
          handleCopy={onFolderCopy}
        />
        {/* Clipboard Copy progress*/}
        {startedTransfers && progressMap && (
          <TransferProgress
            transfers={startedTransfers}
            progressMap={progressMap}
          />
        )}

        <FileList
          files={files.files}
          handleFileDownload={handleDownload}
          handleFileDelete={handleDelete}
          handleFileShareLink={handleShare}
          handleRenameFile={handleRename}
          handleFileCopy={handleCopy}
          handleFileCut={handleCut}
          handleFilePaste={handlePaste}
          handleOpenFile={onOpenFile}
        />
      </Box>
    </Box>
  );
};

export default FilePanel;
