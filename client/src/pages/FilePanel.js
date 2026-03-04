import { Box, Flex, Stack, Text, useBreakpointValue } from "@chakra-ui/react";
import Breadcrumbs from "../components/Breadcrumbs";
import Upload from "../components/UploadComponent";
import DragAndDropComponent from "../components/DragDropComponent";
import CreateFolderComponent from "../components/CreateFolderComponent";
import FolderList from "../components/FolderList";
import FileList from "../components/FileListFiles";
import TransferProgress from "../components/TransferProgress";

const FilePanel = ({
  files, handleDownload, onChangeDirectory, onDeleteFolder,
  handleDownloadFolder, onFolderCopy, handleDelete, handleShare,
  handleRename, handleCopy, handleCut, handlePaste, onOpenFile,
  changeDirectory, onCreateFolder, startedTransfers, progressMap,
  generateBreadcrumb, fileUploadProps,
}) => {
  const isMobile = useBreakpointValue({ base: true, md: false }, { ssr: false }) ?? false;
  const { apiEndpoint, additionalData, onUploadSuccess } = fileUploadProps;

  return (
    <Box h="100%" display="flex" flexDirection="column">
      {/* Upload zone */}
      <Box
        px={{ base: 3, md: 5 }}
        py={4}
        borderBottom="1px solid rgba(255,255,255,0.06)"
        
      >
        <Flex justify="center">
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
        </Flex>
      </Box>

      {/* Breadcrumb + create folder toolbar */}
      <Flex
        align="center"
        justify="space-between"
        gap={3}
        px={{ base: 3, md: 5 }}
        py={3}
        borderBottom="1px solid rgba(255,255,255,0.05)"
        flexWrap="wrap"
      >
        <Breadcrumbs
          breadcrumb={generateBreadcrumb(files.currentDirectory || "/")}
          onClick={changeDirectory}
        />
        <CreateFolderComponent handleCreateFolder={onCreateFolder} />
      </Flex>

      {/* Transfer progress */}
      {startedTransfers && progressMap && (
        <Box px={{ base: 3, md: 5 }} pt={3}>
          <TransferProgress transfers={startedTransfers} progressMap={progressMap} />
        </Box>
      )}

      {/* File browser */}
      <Box flex={1} overflow="auto" px={{ base: 0, md: 0 }}>
        <FolderList
          folders={files.folders}
          changeDirectory={onChangeDirectory}
          deleteFolder={onDeleteFolder}
          downloadFolder={handleDownloadFolder}
          handleCopy={onFolderCopy}
        />
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