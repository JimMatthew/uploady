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
        py="9px"
        justify="space-between"
        borderBottom="1px solid"
        borderColor="rgba(255,255,255,0.06)"
        bg="rgba(255,255,255,0.012)"
      >
        <HStack spacing={2}>
          <Text
            fontSize="10px"
            fontWeight={700}
            letterSpacing="0.09em"
            textTransform="uppercase"
            color="rgba(255,255,255,0.38)"
          >
            Files
          </Text>

          <Flex
            align="center"
            justify="center"
            minW="20px"
            h="18px"
            px="6px"
            borderRadius="5px"
            bg="rgba(255,255,255,0.045)"
            border="1px solid rgba(255,255,255,0.07)"
          >
            <Text
              fontSize="9px"
              fontWeight={600}
              color="rgba(255,255,255,0.38)"
              lineHeight={1}
            >
              {files.length}
            </Text>
          </Flex>
        </HStack>

        <HStack
          spacing="4px"
          p="3px"
          borderRadius="7px"
          bg="rgba(255,255,255,0.025)"
          border="1px solid rgba(255,255,255,0.06)"
        >
          {SORT_FIELDS.map((field) => {
            const active = sortField === field;

            return (
              <Flex
                key={field}
                align="center"
                gap="3px"
                px="8px"
                h="24px"
                borderRadius="5px"
                cursor="pointer"
                bg={active ? "rgba(99,102,241,0.14)" : "transparent"}
                border="1px solid"
                borderColor={active ? "rgba(129,140,248,0.25)" : "transparent"}
                color={active ? "#A5B4FC" : "rgba(255,255,255,0.36)"}
                transition="all 120ms ease"
                onClick={() =>
                  active ? toggleSortDirection() : setSortField(field)
                }
                _hover={{
                  bg: active
                    ? "rgba(99,102,241,0.18)"
                    : "rgba(255,255,255,0.045)",
                  color: active ? "#C7D2FE" : "rgba(255,255,255,0.7)",
                }}
              >
                <Text
                  fontSize="10px"
                  fontWeight={500}
                  textTransform="capitalize"
                  lineHeight={1}
                >
                  {field}
                </Text>

                {active && (
                  <Icon
                    as={sortDirection === "asc" ? FiChevronUp : FiChevronDown}
                    boxSize="11px"
                  />
                )}
              </Flex>
            );
          })}
        </HStack>
      </HStack>

      {/* File rows or empty state */}
      {sortedFiles.length === 0 ? (
        <Flex
          align="center"
          justify="center"
          direction="column"
          gap={2}
          py={12}
        >
          <Flex
            align="center"
            justify="center"
            w="38px"
            h="38px"
            borderRadius="10px"
            bg="rgba(255,255,255,0.025)"
            border="1px solid rgba(255,255,255,0.06)"
          >
            <Icon
              as={FiFileText}
              boxSize="16px"
              color="rgba(255,255,255,0.22)"
            />
          </Flex>

          <Text fontSize="12px" fontWeight={500} color="rgba(255,255,255,0.34)">
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
