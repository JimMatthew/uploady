import React from "react";
import { Box, Text, Button, HStack } from "@chakra-ui/react";
import { useClipboard } from "../contexts/ClipboardContext";
const ClipboardComponent = ({  handlePaste }) => {
    const { copyFile, cutFile, clipboard, clearClipboard } = useClipboard();
  return (
    <Box marginBottom={"5px"}>
      <HStack>
        <Text>
          {clipboard.action === "copy" && `Copied: ${clipboard.file}`}
          {clipboard.action === "cut" && `Cut: ${clipboard.file}`}
        </Text>
        <Button size="sm" onClick={handlePaste}>
          Paste
        </Button>
        <Button size="sm" onClick={clearClipboard}>
          Clear
        </Button>
      </HStack>
    </Box>
  );
};

export default ClipboardComponent