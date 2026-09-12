import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  type MouseEvent,
} from "react";

import { Box, Flex, HStack, Icon, Text } from "@chakra-ui/react";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import FolderItem from "./FolderItem";
import ItemMenu from "./FileMenu";
import {
  ContextMenuState,
  FolderEntry,
  SortDirection,
} from "../types/fileBrowser";

interface FolderListProps {
  folders: FolderEntry[];

  openFolder: (folder: string) => void;

  deleteFolder: (folder: string) => void | Promise<void>;

  downloadFolder: (folder: string) => void | Promise<void>;

  copyFolder: (folder: string) => void | Promise<void>;
}

const FolderList = ({
  folders,
  openFolder,
  deleteFolder,
  downloadFolder,
  copyFolder,
}: FolderListProps) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    position: {
      x: 0,
      y: 0,
    },
    target: null,
    visible: false,
  });

  const openMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>, name: string) => {
      event.preventDefault();

      setContextMenu({
        position: {
          x: event.clientX,
          y: event.clientY,
        },
        target: name,
        visible: true,
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

  useEffect(() => {
    if (!contextMenu.visible || !menuRef.current) {
      return;
    }

    const menu = menuRef.current.getBoundingClientRect();

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let { x, y } = contextMenu.position;

    if (x + menu.width > vw) {
      x = vw - menu.width - 8;
    }

    if (y + menu.height > vh) {
      y = vh - menu.height - 8;
    }

    x = Math.max(8, x);
    y = Math.max(8, y);

    setContextMenu((menuState) => {
      if (menuState.position.x === x && menuState.position.y === y) {
        return menuState;
      }

      return {
        ...menuState,
        position: { x, y },
      };
    });
  }, [contextMenu.visible, contextMenu.position.x, contextMenu.position.y]);

  const toggleSort = useCallback(() => {
    setSortDir((current) => (current === "asc" ? "desc" : "asc"));
  }, []);

  const sorted = useMemo(() => {
    return [...folders].sort((a, b) =>
      sortDir === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name),
    );
  }, [folders, sortDir]);

  if (!folders.length) {
    return null;
  }

  return (
    <Box>
      {/* Section header */}

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
            Folders
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
              lineHeight={1}
              color="rgba(255,255,255,0.38)"
            >
              {folders.length}
            </Text>
          </Flex>
        </HStack>

        {/* Sort */}

        <Flex
          align="center"
          gap="4px"
          h="26px"
          px="8px"
          borderRadius="6px"
          cursor="pointer"
          bg="rgba(255,255,255,0.035)"
          border="1px solid rgba(255,255,255,0.07)"
          color="rgba(255,255,255,0.4)"
          transition="
            background 120ms ease,
            border-color 120ms ease,
            color 120ms ease
          "
          onClick={toggleSort}
          _hover={{
            bg: "rgba(255,255,255,0.06)",
            borderColor: "rgba(255,255,255,0.13)",
            color: "rgba(255,255,255,0.72)",
          }}
        >
          <Text fontSize="10px" fontWeight={500} letterSpacing="0.02em">
            Name
          </Text>

          <Icon
            as={sortDir === "asc" ? FiChevronUp : FiChevronDown}
            boxSize="11px"
          />
        </Flex>
      </HStack>

      {sorted.map((folder) => (
        <FolderItem
          key={folder.name}
          folder={folder.name}
          changeDirectory={openFolder}
          onOpenMenu={openMenu}
        />
      ))}

      {contextMenu.visible && contextMenu.target && (
        <ItemMenu
          ref={menuRef}
          item={contextMenu.target}
          top={contextMenu.position.y}
          left={contextMenu.position.x}
          closeMenu={closeMenu}
          copyItem={copyFolder}
          deleteItem={deleteFolder}
          downloadItem={downloadFolder}
        />
      )}
    </Box>
  );
};

export default FolderList;
