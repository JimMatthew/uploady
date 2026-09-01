import { Box, HStack, Text, Icon, Flex } from "@chakra-ui/react";
import { FiChevronUp, FiChevronDown, FiFileText } from "react-icons/fi";
import { useFileListState } from "../hooks/useFileListFile";
import FileItem from "./FileItem";
import Toolbar from "./Toolbar";
import { useState, useCallback, useEffect, useRef } from "react";
import ItemMenu from "./FileMenu";

const SORT_FIELDS = ["name", "size", "date"];

export default function FileList({
  files,
  downloadFile,
  deleteFile,
  shareFile,
  renameFile,
  copyFile,
  cutFile,
  openFile,
}) {
  const {
    sortedFiles,
    sortDirection,
    sortField,
    setSortField,
    selected,
    toggleSelect,
    copySelected,
    deleteSelected,
    shareSelected,
    clearSelection,
    toggleSortDirection,
  } = useFileListState({
    files,
    copyFile,
    deleteFile,
    shareFile,
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
      renameFile(name, newName);
      setRenamingFile(null);
    },
    [renameFile],
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
        copySelected={copySelected}
        deleteSelected={deleteSelected}
        shareSelected={shareSelected}
        clearSelection={clearSelection}
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
                sortField === field ? toggleSortDirection() : setSortField(field)
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
                      sortDirection === "asc" ? FiChevronUp : FiChevronDown
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
        <ItemMenu
          ref={menuRef}
          item={contextMenu.file}
          top={menuPos.y}
          left={menuPos.x}
          closeMenu={closeMenu}
          copyItem={copyFile}
          cutItem={cutFile}
          deleteItem={deleteFile}
          downloadItem={downloadFile}
          shareItem={shareFile}
          openItem={openFile}
          startRename={setRenamingFile}
        />
      )}
    </Box>
  );
}
