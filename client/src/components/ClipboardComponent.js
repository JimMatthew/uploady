import React from "react";
import {
  Box,
  HStack,
  VStack,
  Text,
  Button,
  Icon,
  useColorModeValue,
} from "@chakra-ui/react";
import { FiCopy, FiScissors, FiFolder, FiFile } from "react-icons/fi";
import { useClipboard } from "../contexts/ClipboardContext";
const ClipboardComponent = ({ handlePaste }) => {
  const { clipboard, clearClipboard } = useClipboard();
  //const bgi = useColorModeValue("gray.50", "gray.700");
  //const bgg = useColorModeValue("gray.700", "gray.200");
  const bga = useColorModeValue("white", "gray.800");
  const bgb = useColorModeValue("gray.200", "gray.700")
  const bgc = useColorModeValue("gray.700", "gray.200")
  return (
    <Box
      mb={4}
      p={4}
      bg={bga}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={bgb}
      shadow="md"
      transition="all 0.2s"
      _hover={{ shadow: "lg" }}
    >
      <HStack justify="space-between" align="start">
        {/* Clipboard items */}
        <VStack align="start" spacing={2}>
          {clipboard.map((item, index) => (
            <HStack key={index} spacing={2}>
              <Icon
                as={
                  item.isDirectory
                    ? FiFolder
                    : item.action === "copy"
                      ? FiFile
                      : FiScissors
                }
                color={
                  item.action === "copy"
                    ? "blue.500"
                    : item.action === "cut"
                      ? "orange.400"
                      : "gray.500"
                }
              />
              <Text
                fontSize="sm"
                fontWeight="medium"
                color={bgc}
              >
                {item.action === "copy" && `Copied: ${item.file}`}
                {item.action === "cut" && `Cut: ${item.file}`}
              </Text>
            </HStack>
          ))}
        </VStack>

        {/* Actions */}
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
