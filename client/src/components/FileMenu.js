import { forwardRef } from "react";
import { Box, HStack, Text, Icon } from "@chakra-ui/react";
import {
  FiCopy,
  FiScissors,
  FiTrash2,
  FiDownload,
  FiShare2,
  FiEdit2,
  FiFileText,
} from "react-icons/fi";

const MenuItem = ({ icon, label, onClick, danger }) => (
  <HStack
    px={3}
    py="7px"
    spacing={3}
    cursor="pointer"
    transition="all 0.1s"
    role="group"
    _hover={{
      bg: danger ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.07)",
    }}
    onClick={onClick}
  >
    <Icon
      as={icon}
      boxSize="14px"
      color={danger ? "rgba(239,68,68,0.7)" : "rgba(255,255,255,0.4)"}
      _groupHover={{
        color: danger ? "#EF4444" : "rgba(255,255,255,0.8)",
      }}
      transition="color 0.1s"
    />
    <Text
      fontSize="13px"
      fontWeight={450}
      color={danger ? "rgba(239,68,68,0.85)" : "rgba(255,255,255,0.65)"}
      _groupHover={{
        color: danger ? "#EF4444" : "rgba(255,255,255,0.95)",
      }}
      transition="color 0.1s"
      letterSpacing="-0.01em"
    >
      {label}
    </Text>
  </HStack>
);

const Divider = () => (
  <Box mx={2} my="2px" h="1px" bg="rgba(255,255,255,0.07)" />
);

/**
 * Right-click context menu for file or folder items.
 * Only renders actions supplied by the parent.
 *
 * Uses forwardRef so the parent can measure dimensions and reposition
 * the menu if it would overflow the viewport edges.
 */
const ItemMenu = forwardRef(
  (
    {
      top,
      left,
      item,
      closeMenu,
      copyItem,
      cutItem,
      deleteItem,
      downloadItem,
      shareItem,
      openItem,
      startRename,
    },
    ref,
  ) => {
    const wrap = (action) => () => {
      action(item);
      closeMenu();
    };

    return (
      <Box
        ref={ref}
        position="fixed"
        top={`${top}px`}
        left={`${left}px`}
        bg="rgba(22, 26, 38, 0.98)"
        backdropFilter="blur(20px)"
        border="1px solid rgba(255,255,255,0.1)"
        borderRadius="10px"
        boxShadow="0 8px 32px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.05) inset"
        zIndex={9999}
        onMouseLeave={closeMenu}
        minW="172px"
        overflow="hidden"
        py="4px"
      >
        {/* Item name */}
        <Box px={3} pt={2} pb="6px">
          <Text
            fontSize="11px"
            color="rgba(255,255,255,0.3)"
            noOfLines={1}
            letterSpacing="0.01em"
            fontFamily="'JetBrains Mono', monospace"
          >
            {item}
          </Text>
        </Box>

        <Divider />

        {copyItem && (
          <MenuItem
            icon={FiCopy}
            label="Copy"
            onClick={wrap(copyItem)}
          />
        )}

        {cutItem && (
          <MenuItem
            icon={FiScissors}
            label="Cut"
            onClick={wrap(cutItem)}
          />
        )}

        {startRename && (
          <MenuItem
            icon={FiEdit2}
            label="Rename"
            onClick={wrap(startRename)}
          />
        )}

        {openItem && (
          <MenuItem
            icon={FiFileText}
            label="Open"
            onClick={wrap(openItem)}
          />
        )}

        {(downloadItem || shareItem) && <Divider />}

        {downloadItem && (
          <MenuItem
            icon={FiDownload}
            label="Download"
            onClick={wrap(downloadItem)}
          />
        )}

        {shareItem && (
          <MenuItem
            icon={FiShare2}
            label="Share link"
            onClick={wrap(shareItem)}
          />
        )}

        {deleteItem && (
          <>
            <Divider />
            <MenuItem
              icon={FiTrash2}
              label="Delete"
              onClick={wrap(deleteItem)}
              danger
            />
          </>
        )}
      </Box>
    );
  },
);

ItemMenu.displayName = "ItemMenu";

export default ItemMenu;