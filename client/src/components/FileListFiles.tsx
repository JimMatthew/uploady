import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type MouseEvent,
} from "react";

import { Box, HStack, Text, Icon, Flex } from "@chakra-ui/react";
import { FiChevronUp, FiChevronDown, FiFileText } from "react-icons/fi";
import { useFileListState } from "../hooks/useFileListFile";
import FileItem from "./FileItem";
import Toolbar from "./Toolbar";
import ItemMenu from "./FileMenu";
import type {
  FileEntry,
  FileAction,
  RenameFileAction,
  FileBatchAction,
} from "../types/fileBrowser";
const SORT_FIELDS = ["name", "size", "date"] as const;

type SortField = (typeof SORT_FIELDS)[number];

interface FileListProps {
  files: FileEntry[];

  downloadFile: FileAction;
  deleteFile: FileAction;
  deleteFiles: FileBatchAction
  shareFile: FileAction;

  renameFile: RenameFileAction;

  copyFile: FileAction;
  cutFile: FileAction;
  openFile: FileAction;
}

interface MenuPosition {
  x: number;
  y: number;
}

interface ContextMenuState {
  x: number;
  y: number;
  file: string | null;
  visible: boolean;
}

export default function FileList({
  files,
  downloadFile,
  deleteFile,
  deleteFiles,
  shareFile,
  renameFile,
  copyFile,
  cutFile,
  openFile,
}: FileListProps) {
  const {
    sortedFiles,
    sortDirection,
    sortField,
    setSortField,
    selected,
    setFileSelected,
    copySelected,
    deleteSelected,
    shareSelected,
    clearSelection,
    toggleSortDirection,
  } = useFileListState({
    files,
    copyFile,
    deleteFile,
    deleteFiles,
    shareFile,
  });

  const menuRef = useRef<HTMLDivElement | null>(null);

  /*
   * Drag selection state lives in refs because changing these values
   * does not need to cause the file list to render.
   */
  const dragActiveRef = useRef(false);
  const dragSelectValueRef = useRef(true);
  const dragVisitedRef = useRef<Set<string>>(new Set());
  const [renamingFile, setRenamingFile] = useState<string | null>(null);

  const [menuPos, setMenuPos] = useState<MenuPosition>({
    x: 0,
    y: 0,
  });

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    file: null,
    visible: false,
  });

  const openMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>, fileName: string) => {
      event.preventDefault();

      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        file: fileName,
        visible: true,
      });

      setMenuPos({
        x: event.clientX,
        y: event.clientY,
      });
    },
    [],
  );

  const closeMenu = useCallback(() => {
    setContextMenu((menu) => ({
      ...menu,
      visible: false,
    }));
  }, []);

  const onRename = useCallback(
    (name: string, newName: string) => {
      void renameFile(name, newName);

      setRenamingFile(null);
    },
    [renameFile],
  );

  const onRenameClose = useCallback(() => {
    setRenamingFile(null);
  }, []);

  /*
   * The state of the first file determines what this drag does.
   *
   * Starting on an unselected file:
   *   -> this drag selects files
   *
   * Starting on a selected file:
   *   -> this drag deselects files
   */
  const startDragSelection = useCallback(
    (fileName: string) => {
      const shouldSelect = !selected.has(fileName);
      dragActiveRef.current = true;
      dragSelectValueRef.current = shouldSelect;
      dragVisitedRef.current = new Set([fileName]);
      setFileSelected(fileName, shouldSelect);
    },
    [selected, setFileSelected],
  );

  /*
   * Called whenever the pointer crosses into another file row.
   */
  const enterDragSelection = useCallback(
    (fileName: string) => {
      if (!dragActiveRef.current) {
        return;
      }

      /*
       * Pointer events can occasionally enter an element after the
       * mouse button has already been released outside the document.
       * The global pointerup/blur handlers normally prevent this,
       * but visited tracking also keeps the operation deterministic.
       */
      if (dragVisitedRef.current.has(fileName)) {
        return;
      }

      dragVisitedRef.current.add(fileName);

      setFileSelected(fileName, dragSelectValueRef.current);
    },
    [setFileSelected],
  );

  const stopDragSelection = useCallback(() => {
    dragActiveRef.current = false;

    dragVisitedRef.current.clear();
  }, []);

  /*
   * Stop drag selection even if the pointer is released outside a
   * particular FileItem.
   */
  useEffect(() => {
    window.addEventListener("pointerup", stopDragSelection);
    window.addEventListener("pointercancel", stopDragSelection);
    window.addEventListener("blur", stopDragSelection);

    return () => {
      window.removeEventListener("pointerup", stopDragSelection);
      window.removeEventListener("pointercancel", stopDragSelection);
      window.removeEventListener("blur", stopDragSelection);
    };
  }, [stopDragSelection]);

  // Reposition context menu if it would overflow viewport.
  useEffect(() => {
    if (!contextMenu.visible || !menuRef.current) {
      return;
    }

    const menu = menuRef.current.getBoundingClientRect();

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = contextMenu.x;
    let y = contextMenu.y;

    if (x + menu.width > vw) {
      x = vw - menu.width - 8;
    }

    if (y + menu.height > vh) {
      y = vh - menu.height - 8;
    }

    x = Math.max(8, x);
    y = Math.max(8, y);

    setMenuPos({
      x,
      y,
    });
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
                onClick={() => {
                  if (active) {
                    toggleSortDirection();
                  } else {
                    setSortField(field as SortField);
                  }
                }}
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
            onDragSelectStart={startDragSelection}
            onDragSelectEnter={enterDragSelection}
            onOpenMenu={openMenu}
            isRenaming={renamingFile === file.name}
            onRename={onRename}
            onRenameClose={onRenameClose}
          />
        ))
      )}

      {contextMenu.visible && contextMenu.file && (
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
          startRename={(fileName) => {
            setRenamingFile(fileName);
          }}
        />
      )}
    </Box>
  );
}
