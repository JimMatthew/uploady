import { Box, HStack, Text, Icon, Flex } from "@chakra-ui/react";
import { FiChevronUp, FiChevronDown, FiFileText } from "react-icons/fi";
import { useFileList } from "../hooks/useFileListFile";
import FileItem from "./FileItem";
import Toolbar from "./Toolbar";
import { useState, useCallback, useEffect, useRef } from "react";
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

  const menuRef = useRef(null);
  const [renamingFile, setRenamingFile] = useState(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
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
    setMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  const closeMenu = useCallback(
    () => setContextMenu((m) => ({ ...m, visible: false })),
    [],
  );

  const onRename = useCallback(
    (name, newName) => {
      handleRenameFile(name, newName);
      setRenamingFile(null);
    },
    [handleRenameFile],
  );
  const onRenameClose = useCallback(() => setRenamingFile(null), []);

  // Reposition context menu if it would overflow viewport
  useEffect(() => {
    if (!contextMenu.visible || !menuRef.current) return;

    const menu = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = contextMenu.x;
    let y = contextMenu.y;

    if (x + menu.width > vw) x = vw - menu.width - 8;
    if (y + menu.height > vh) y = vh - menu.height - 8;

    x = Math.max(8, x);
    y = Math.max(8, y);

    setMenuPos({ x, y });
  }, [contextMenu.visible, contextMenu.x, contextMenu.y]);

  return (
    <Box>
      <Toolbar
        selected={selected}
        handleCopy={handleCopy}
        handleDelete={handleDelete}
        handleClear={clearSelection}
        handleShare={handleShare}
      />

      {/* Section header + sort controls */}
      <HStack
        px={4}
        py={2}
        justify="space-between"
        borderBottom="1px solid rgba(255,255,255,0.06)"
      >
        <HStack spacing={2}>
          <Text
            fontSize="10px"
            fontWeight="700"
            letterSpacing="0.1em"
            textTransform="uppercase"
            color="rgba(255,255,255,0.3)"
          >
            Files
          </Text>
          <Text
            fontSize="10px"
            fontWeight="600"
            color="rgba(255,255,255,0.2)"
            letterSpacing="0.05em"
          >
            {files.length}
          </Text>
        </HStack>

        {/* Sort pills */}
        <HStack spacing={1}>
          {SORT_FIELDS.map((field) => (
            <Box
              key={field}
              px={2}
              py="2px"
              borderRadius="4px"
              cursor="pointer"
              bg={sortField === field ? "rgba(99,102,241,0.15)" : "transparent"}
              border="1px solid"
              borderColor={
                sortField === field ? "rgba(99,102,241,0.35)" : "transparent"
              }
              onClick={() =>
                sortField === field ? toggleFileSort() : setSortField(field)
              }
              transition="all 0.12s"
              _hover={{ borderColor: "rgba(255,255,255,0.12)" }}
            >
              <HStack spacing={1}>
                <Text
                  fontSize="10px"
                  letterSpacing="0.05em"
                  color={
                    sortField === field ? "#818CF8" : "rgba(255,255,255,0.28)"
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

      {/* File rows or empty state */}
      {sortedFiles.length === 0 ? (
        <Flex
          align="center"
          justify="center"
          direction="column"
          gap={2}
          py={10}
          color="rgba(255,255,255,0.12)"
        >
          <Icon as={FiFileText} boxSize="26px" />
          <Text fontSize="12px" letterSpacing="0.02em">
            No files in this folder
          </Text>
        </Flex>
      ) : (
        sortedFiles.map((file) => (
          <FileItem
            key={file.name}
            name={file.name}
            size={file.size}
            date={file.date}
            isSelected={selected.has(file.name)}
            onSelect={toggleSelect}
            onOpenMenu={openMenu}
            isRenaming={renamingFile === file.name}
            onRename={onRename}
            onRenameClose={onRenameClose}
          />
        ))
      )}

      {contextMenu.visible && (
        <FileMenu
          ref={menuRef}
          file={contextMenu.file}
          top={menuPos.y}
          left={menuPos.x}
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
