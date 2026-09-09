import { forwardRef } from "react";
import { Box, HStack, Icon, Text } from "@chakra-ui/react";

import {
  FiCopy,
  FiScissors,
  FiTrash2,
  FiDownload,
  FiShare2,
  FiEdit2,
  FiFileText,
} from "react-icons/fi";

const MenuItem = ({ icon, label, onClick, danger = false }) => (
  <HStack
    role="group"
    spacing={3}
    px={3}
    h="32px"
    cursor="pointer"
    borderRadius="6px"
    color="rgba(255,255,255,0.58)"
    transition="
      background 100ms ease,
      color 100ms ease
    "
    onClick={onClick}
    _hover={{
      bg: danger ? "rgba(229,115,115,0.09)" : "rgba(255,255,255,0.055)",
      color: danger ? "#E57373" : "rgba(255,255,255,0.9)",
    }}
  >
    <Icon
      as={icon}
      boxSize="13px"
      flexShrink={0}
      color={danger ? "rgba(255,255,255,0.36)" : "rgba(255,255,255,0.38)"}
      transition="color 100ms ease"
      _groupHover={{
        color: danger ? "#E57373" : "rgba(255,255,255,0.76)",
      }}
    />

    <Text
      fontSize="12px"
      fontWeight={500}
      letterSpacing="-0.01em"
      transition="color 100ms ease"
    >
      {label}
    </Text>
  </HStack>
);

const Divider = () => (
  <Box mx={2} my="4px" h="1px" bg="rgba(255,255,255,0.065)" />
);

/**
 * Right-click context menu for file or folder items.
 *
 * Only actions supplied by the parent are rendered.
 *
 * forwardRef allows the parent to measure the menu and reposition
 * it when it would overflow the viewport.
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
        zIndex={9999}
        minW="180px"
        maxW="280px"
        p="4px"
        bg="rgba(27,31,42,0.98)"
        backdropFilter="blur(18px)"
        border="1px solid rgba(255,255,255,0.1)"
        borderRadius="9px"
        boxShadow="
          0 12px 32px rgba(0,0,0,0.45),
          0 1px 2px rgba(0,0,0,0.3)
        "
        onMouseLeave={closeMenu}
      >
        {/* Item name */}
        <Box px={2} pt="5px" pb="6px">
          <Text
            fontSize="10px"
            fontWeight={500}
            lineHeight={1.4}
            letterSpacing="0.01em"
            color="rgba(255,255,255,0.4)"
            fontFamily="'JetBrains Mono', monospace"
            noOfLines={1}
            title={item}
          >
            {item}
          </Text>
        </Box>

        <Divider />

        {openItem && (
          <MenuItem icon={FiFileText} label="Open" onClick={wrap(openItem)} />
        )}

        {startRename && (
          <MenuItem icon={FiEdit2} label="Rename" onClick={wrap(startRename)} />
        )}

        {(copyItem || cutItem) && (
          <>
            {(openItem || startRename) && <Divider />}

            {copyItem && (
              <MenuItem icon={FiCopy} label="Copy" onClick={wrap(copyItem)} />
            )}

            {cutItem && (
              <MenuItem icon={FiScissors} label="Cut" onClick={wrap(cutItem)} />
            )}
          </>
        )}

        {(downloadItem || shareItem) && (
          <>
            <Divider />

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
          </>
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
