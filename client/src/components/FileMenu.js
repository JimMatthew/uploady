import { Box, Button } from "@chakra-ui/react";

export default function FileMenu({
  file,
  top,
  left,
  closeMenu,
  handleFileCopy,
  handleFileCut,
  handleFileDelete,
  handleFileDownload,
  handleFileShareLink,
  handleOpenFile,
  setRenamingFile,
}) {
  return (
    <Box
      position="fixed"
      top={top}
      left={left}
      bg="grey.700"
      borderWidth="1px"
      borderRadius="md"
      shadow="lg"
      zIndex={9999}
      onMouseLeave={closeMenu}
    >
      <Button
        onClick={() => {
          handleFileCopy(file);
          closeMenu();
        }}
      >
        Copy
      </Button>
      <Button
        onClick={() => {
          handleFileCut(file);
          closeMenu();
        }}
      >
        Cut
      </Button>
      <Button
        onClick={() => {
          handleFileDelete(file);
          closeMenu();
        }}
      >
        Delete
      </Button>
      <Button
        onClick={() => {
          handleFileDownload(file);
          closeMenu();
        }}
      >
        Download
      </Button>
      <Button
        onClick={() => {
          handleFileShareLink(file);
          closeMenu();
        }}
      >
        Share
      </Button>
      <Button
        onClick={() => {
          setRenamingFile(file);
          closeMenu();
        }}
      >
        Rename
      </Button>
      {handleOpenFile && (
        <Button
          onClick={() => {
            handleOpenFile(file);
            closeMenu();
          }}
        >
          Open
        </Button>
      )}
    </Box>
  );
}
