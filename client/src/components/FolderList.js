import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Box, HStack, Text, Icon } from "@chakra-ui/react";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
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

  const closeMenu = () => setContextMenu((m) => ({ ...m, visible: false }));

  useEffect(() => {
    if (!contextMenu.visible || !menuRef.current) return;

    const menu = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = contextMenu.x;
    let y = contextMenu.y;

    if (x + menu.width > vw) x = vw - menu.width - 8;
    if (y + menu.height > vh) y = vh - menu.height - 8;

    // Clamp to viewport edges
    x = Math.max(8, x);
    y = Math.max(8, y);

    setMenuPos({ x, y });
  }, [contextMenu.visible, contextMenu.x, contextMenu.y]);

  const toggleSort = useCallback(() => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }, []);

  const sorted = useMemo(() => {
    return [...folders].sort((a, b) =>
      sortDir === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name),
    );
  }, [folders, sortDir]);

  return (
    <Box mb={6}>
      {/* Section header */}
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
          color="rgba(255, 255, 255, 0.4)"
        >
          Folders
          <Text as="span" ml={2} color="rgba(255, 255, 255, 0.35)">
            {folders.length}
          </Text>
        </Text>
        <HStack
          spacing={1}
          cursor="pointer"
          onClick={toggleSort}
          _hover={{ color: "rgba(255,255,255,0.6)" }}
          color="rgba(255, 255, 255, 0.35)"
          transition="color 0.15s"
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

      <Box>
        {sorted.map((folder) => (
          <FolderItem
            key={folder.name}
            folder={folder.name}
            changeDirectory={changeDirectory}
            onOpenMenu={openMenu}
          />
        ))}
      </Box>

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
