import { Box, HStack, Text, Icon } from "@chakra-ui/react";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import { useFileList } from "../hooks/useFileListFile";
import FileItem from "./FileItem";
import ClipboardComponent from "./ClipboardComponent";
import Toolbar from "./Toolbar";
import { useClipboard } from "../contexts/ClipboardContext";
import { useState, useCallback } from "react";
import FileMenu from "./FileMenu";

const SORT_FIELDS = ["name", "size", "date"];

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

  const { clipboard } = useClipboard();
  const [renamingFile, setRenamingFile] = useState(null);
  const [contextMenu, setContextMenu] = useState({
    x: 0,
    y: 0,
    file: null,
    visible: false,
  });

  const openMenu = useCallback((e, fileName) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      file: fileName,
      visible: true,
    });
  }, []);

  const closeMenu = () => setContextMenu((m) => ({ ...m, visible: false }));

  const onRename = useCallback(
    (name, newName) => {
      handleRenameFile(name, newName);
      setRenamingFile(null);
    },
    [handleRenameFile],
  );

  return (
    <Box>
      <Toolbar
        selected={selected}
        handleCopy={handleCopy}
        handleDelete={handleDelete}
        handleClear={clearSelection}
        handleShare={handleShare}
      />

      {clipboard[0] && <ClipboardComponent handlePaste={handleFilePaste} />}

      {/* Section header + sort controls */}
      <HStack
        px={4}
        py={2}
        mb={1}
        justify="space-between"
        borderBottom="1px solid rgba(255,255,255,0.07)"
      >
        <Text
          fontSize="10px"
          fontWeight="700"
          letterSpacing="0.1em"
          textTransform="uppercase"
          color="rgba(255, 255, 255, 0.46)"
        >
          Files
          <Text as="span" ml={2} color="rgba(255, 255, 255, 0.4)">
            {files.length}
          </Text>
        </Text>

        {/* Sort field pills */}
        <HStack spacing={1}>
          {SORT_FIELDS.map((field) => (
            <Box
              key={field}
              px={2}
              py="2px"
              borderRadius="4px"
              cursor="pointer"
              bg={sortField === field ? "rgba(99,102,241,0.2)" : "transparent"}
              border="1px solid"
              borderColor={
                sortField === field ? "rgba(99,102,241,0.4)" : "transparent"
              }
              onClick={() =>
                sortField === field ? toggleFileSort() : setSortField(field)
              }
              transition="all 0.12s"
              _hover={{ borderColor: "rgba(255,255,255,0.15)" }}
            >
              <HStack spacing={1}>
                <Text
                  fontSize="10px"
                  letterSpacing="0.05em"
                  color={
                    sortField === field ? "#818CF8" : "rgba(255,255,255,0.3)"
                  }
                  textTransform="capitalize"
                >
                  {field}
                </Text>
                {sortField === field && (
                  <Icon
                    as={
                      fileSortDirection === "asc" ? FiChevronUp : FiChevronDown
                    }
                    boxSize={3}
                    color="#818CF8"
                  />
                )}
              </HStack>
            </Box>
          ))}
        </HStack>
      </HStack>

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
          onRename={onRename}
          onRenameClose={() => setRenamingFile(null)}
        />
      ))}

      {contextMenu.visible && (
        <FileMenu
          file={contextMenu.file}
          top={contextMenu.y}
          left={contextMenu.x}
          closeMenu={closeMenu}
          handleFileCopy={handleFileCopy}
          handleFileCut={handleFileCut}
          handleFileDelete={handleFileDelete}
          handleFileDownload={handleFileDownload}
          handleFileShareLink={handleFileShareLink}
          handleOpenFile={handleOpenFile}
          setRenamingFile={setRenamingFile}
        />
      )}
    </Box>
  );
}
