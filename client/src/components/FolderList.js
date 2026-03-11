import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Box, HStack, Text, Icon, Flex } from "@chakra-ui/react";
import { FiChevronUp, FiChevronDown, FiFolder } from "react-icons/fi";
import FolderItem from "./FolderItem";
import FileMenu from "./FileMenu";

const FolderList = ({
  folders,
  changeDirectory,
  deleteFolder,
  downloadFolder,
  handleCopy,
}) => {
  const menuRef = useRef(null);
  const [sortDir, setSortDir] = useState("asc");
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [visibleCount, setVisibleCount] = useState(20);
  const [contextMenu, setContextMenu] = useState({
    x: 0,
    y: 0,
    file: null,
    visible: false,
  });

  const openMenu = useCallback((e, name) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file: name, visible: true });
    setMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
  setVisibleCount(20);
  if (folders.length > 20) {
    const t = requestAnimationFrame(() =>
      setVisibleCount(folders.length)
    );
    return () => cancelAnimationFrame(t);
  }
}, [folders]);

  const closeMenu = useCallback(
    () => setContextMenu((m) => ({ ...m, visible: false })),
    [],
  );

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

  const toggleSort = useCallback(() => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }, []);

  const sorted = useMemo(
    () =>
      [...folders].sort((a, b) =>
        sortDir === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name),
      ),
    [folders, sortDir],
  );

  if (!folders.length) return null;

  return (
    <Box>
      {/* Section header */}
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
            Folders
          </Text>
          <Text
            fontSize="10px"
            fontWeight="600"
            color="rgba(255,255,255,0.2)"
            letterSpacing="0.05em"
          >
            {folders.length}
          </Text>
        </HStack>

        <HStack
          spacing={1}
          cursor="pointer"
          onClick={toggleSort}
          color="rgba(255,255,255,0.25)"
          transition="color 0.12s"
          _hover={{ color: "rgba(255,255,255,0.6)" }}
        >
          <Text fontSize="10px" letterSpacing="0.05em">
            {sortDir === "asc" ? "A → Z" : "Z → A"}
          </Text>
          <Icon
            as={sortDir === "asc" ? FiChevronUp : FiChevronDown}
            boxSize={3}
          />
        </HStack>
      </HStack>

      {sorted.slice(0, visibleCount).map((folder) => (
        <FolderItem
          key={folder.name}
          folder={folder.name}
          changeDirectory={changeDirectory}
          onOpenMenu={openMenu}
        />
      ))}

      {contextMenu.visible && (
        <FileMenu
          ref={menuRef}
          file={contextMenu.file}
          top={menuPos.y}
          left={menuPos.x}
          closeMenu={closeMenu}
          handleFileCopy={handleCopy}
          handleFileDelete={deleteFolder}
          handleFileDownload={downloadFolder}
        />
      )}
    </Box>
  );
};

export default FolderList;