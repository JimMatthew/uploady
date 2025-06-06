import React from "react";
import { Box, Text, Button, HStack, useColorModeValue } from "@chakra-ui/react";
import { useClipboard } from "../contexts/ClipboardContext";
const ClipboardComponent = ({ handlePaste }) => {
  const { clipboard, clearClipboard } = useClipboard();
   const bgi = useColorModeValue("gray.50", "gray.700");
   const bgg = useColorModeValue("gray.700", "gray.200");
  return (
    <Box
      mb={4}
      p={3}
      bg={bgi}
      borderRadius="md"
      borderWidth="1px"
      borderColor="gray.200"
      boxShadow="sm"
    >
      <HStack justify="space-between" align="start">
    <Box>
      {clipboard.map((item, index) => (
        <Text key={index} color={bgg} fontWeight="medium">
          {item.action === "copy" && item.isDirectory ? `📁 Copied: ${item.file}`:`📄 Copied: ${item.file}`}
          {item.action === "cut" && `✂️ Cut: ${item.file}`}
        </Text>
      ))}
    </Box>
    <HStack spacing={2}>
      <Button size="sm" colorScheme="blue" onClick={handlePaste}>
        Paste
      </Button>
      <Button size="sm" variant="outline" onClick={clearClipboard}>
        Clear
      </Button>
    </HStack>
  </HStack>
    </Box>
  );
};

export default ClipboardComponent;
