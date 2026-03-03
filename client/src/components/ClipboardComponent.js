import React from "react";
import { Box, HStack, VStack, Text, Flex, Icon } from "@chakra-ui/react";
import { FiCopy, FiScissors, FiFile, FiFolder, FiClipboard } from "react-icons/fi";
import { useClipboard } from "../contexts/ClipboardContext";

const ClipboardComponent = ({ handlePaste }) => {
  const { clipboard, clearClipboard } = useClipboard();

  return (
    <Box
      mb={3}
      px={4}
      py={3}
      bg="rgba(251,191,36,0.05)"
      border="1px solid rgba(251,191,36,0.15)"
      borderRadius="9px"
    >
      <HStack justify="space-between" align="start">
        {/* Items */}
        <VStack align="start" spacing="6px" flex={1} minW={0}>
          {clipboard.map((item, i) => (
            <HStack key={i} spacing={2}>
              <Icon
                as={item.isDirectory ? FiFolder : item.action === "cut" ? FiScissors : FiFile}
                boxSize="12px"
                color={item.action === "cut" ? "#FB923C" : "#FBBF24"}
                flexShrink={0}
              />
              <Text
                fontSize="12px"
                fontFamily="'JetBrains Mono', monospace"
                color="rgba(255,255,255,0.55)"
                noOfLines={1}
              >
                <Text as="span" color={item.action === "cut" ? "#FB923C" : "#FBBF24"} fontWeight={600} mr={1}>
                  {item.action === "cut" ? "cut" : "copy"}
                </Text>
                {item.file}
              </Text>
            </HStack>
          ))}
        </VStack>

        {/* Actions */}
        <HStack spacing={2} flexShrink={0}>
          <Flex
            align="center" gap={2}
            px={3} h="28px"
            borderRadius="6px"
            bg="rgba(251,191,36,0.15)"
            border="1px solid rgba(251,191,36,0.25)"
            color="#FBBF24"
            cursor="pointer"
            fontSize="12px" fontWeight={600}
            transition="all 0.12s"
            _hover={{ bg: "rgba(251,191,36,0.22)" }}
            onClick={handlePaste}
          >
            <FiClipboard size={12} />
            Paste
          </Flex>
          <Flex
            align="center"
            px={3} h="28px"
            borderRadius="6px"
            border="1px solid rgba(255,255,255,0.08)"
            color="rgba(255,255,255,0.35)"
            cursor="pointer"
            fontSize="12px" fontWeight={500}
            transition="all 0.12s"
            _hover={{ borderColor: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.7)" }}
            onClick={clearClipboard}
          >
            Clear
          </Flex>
        </HStack>
      </HStack>
    </Box>
  );
};

export default ClipboardComponent;