import { Box, VStack, Button, useColorModeValue } from "@chakra-ui/react";
import {
  FiCopy,
  FiScissors,
  FiTrash2,
  FiDownload,
  FiShare2,
  FiEdit2,
  FiFileText,
} from "react-icons/fi";

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
  const bgColor = useColorModeValue("white", "gray.800");
  const hoverColor = useColorModeValue("gray.100", "gray.700");

  const MenuButton = ({ onClick, icon, children }) => (
    <Button
      onClick={onClick}
      justifyContent="flex-start"
      variant="ghost"
      size="sm"
      w="100%"
      borderRadius="none"
      leftIcon={icon}
      _hover={{ bg: hoverColor }}
    >
      {children}
    </Button>
  );

  return (
    <Box
      position="fixed"
      top={top}
      left={left}
      bg={bgColor}
      borderWidth="1px"
      borderRadius="md"
      boxShadow="xl"
      zIndex={9999}
      onMouseLeave={closeMenu}
      minW="160px"
      overflow="hidden"
    >
      <VStack align="stretch" spacing={0}>
        <MenuButton
          icon={<FiCopy />}
          onClick={() => {
            handleFileCopy(file);
            closeMenu();
          }}
        >
          Copy
        </MenuButton>
        <MenuButton
          icon={<FiScissors />}
          onClick={() => {
            handleFileCut(file);
            closeMenu();
          }}
        >
          Cut
        </MenuButton>
        <MenuButton
          icon={<FiTrash2 />}
          onClick={() => {
            handleFileDelete(file);
            closeMenu();
          }}
        >
          Delete
        </MenuButton>
        <MenuButton
          icon={<FiDownload />}
          onClick={() => {
            handleFileDownload(file);
            closeMenu();
          }}
        >
          Download
        </MenuButton>
        <MenuButton
          icon={<FiShare2 />}
          onClick={() => {
            handleFileShareLink(file);
            closeMenu();
          }}
        >
          Share
        </MenuButton>
        <MenuButton
          icon={<FiEdit2 />}
          onClick={() => {
            setRenamingFile(file);
            closeMenu();
          }}
        >
          Rename
        </MenuButton>
        {handleOpenFile && (
          <MenuButton
            icon={<FiFileText />}
            onClick={() => {
              handleOpenFile(file);
              closeMenu();
            }}
          >
            Open
          </MenuButton>
        )}
      </VStack>
    </Box>
  );
};

export default FileContextMenu;
