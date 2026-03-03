import { Box, VStack, HStack, Text, Icon } from "@chakra-ui/react";
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
    _hover={{ bg: danger ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.07)" }}
    onClick={onClick}
  >
    <Icon
      as={icon}
      boxSize="14px"
      color={danger ? "rgba(239,68,68,0.7)" : "rgba(255,255,255,0.4)"}
      _groupHover={{ color: danger ? "#EF4444" : "rgba(255,255,255,0.8)" }}
      transition="color 0.1s"
    />
    <Text
      fontSize="13px"
      fontWeight={450}
      color={danger ? "rgba(239,68,68,0.85)" : "rgba(255,255,255,0.65)"}
      _groupHover={{ color: danger ? "#EF4444" : "rgba(255,255,255,0.95)" }}
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

const FileContextMenu = ({
  top,
  left,
  file,
  closeMenu,
  handleFileCopy,
  handleFileCut,
  handleFileDelete,
  handleFileDownload,
  handleFileShareLink,
  handleOpenFile,
  setRenamingFile,
}) => {
  const wrap = (fn) => () => {
    fn(file);
    closeMenu();
  };

  return (
    <Box
      position="fixed"
      top={top}
      left={left}
      bg="rgba(18, 18, 24, 0.97)"
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
      {/* Filename header */}
      <Box px={3} pt={2} pb="6px">
        <Text
          fontSize="11px"
          color="rgba(255,255,255,0.3)"
          noOfLines={1}
          letterSpacing="0.01em"
          fontFamily="'JetBrains Mono', monospace"
        >
          {file}
        </Text>
      </Box>
      <Divider />

      <MenuItem icon={FiCopy} label="Copy" onClick={wrap(handleFileCopy)} />
      {handleFileCut && (
        <MenuItem icon={FiScissors} label="Cut" onClick={wrap(handleFileCut)} />
      )}
      {setRenamingFile && (
        <MenuItem
          icon={FiEdit2}
          label="Rename"
          onClick={wrap(setRenamingFile)}
        />
      )}
      {handleOpenFile && (
        <MenuItem
          icon={FiFileText}
          label="Open"
          onClick={wrap(handleOpenFile)}
        />
      )}

      {(handleFileDownload || handleFileShareLink) && <Divider />}

      {handleFileDownload && (
        <MenuItem
          icon={FiDownload}
          label="Download"
          onClick={wrap(handleFileDownload)}
        />
      )}
      {handleFileShareLink && (
        <MenuItem
          icon={FiShare2}
          label="Share link"
          onClick={wrap(handleFileShareLink)}
        />
      )}

      <Divider />
      <MenuItem
        icon={FiTrash2}
        label="Delete"
        onClick={wrap(handleFileDelete)}
        danger
      />
    </Box>
  );
};

export default FileContextMenu;
