import React from "react";
import {  useCallback } from "react";
import { Box, HStack, VStack, Text, Flex, Icon } from "@chakra-ui/react";
import {
  FiCopy,
  FiScissors,
  FiFile,
  FiFolder,
  FiClipboard,
  FiX,
} from "react-icons/fi";
import { useClipboard } from "../contexts/ClipboardContext";
import apiClient from "../services/apiClient";
const ClipboardComponent = ({ handlePaste, pasteable = true }) => {
  const { clipboard, clearClipboard, removeFromClipboard } = useClipboard();

  const downloadFileBlob = useCallback((blob, filename) => {
      const url = window.URL.createObjectURL(blob);
  
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
  
      document.body.appendChild(a);
      a.click();
      a.remove();
  
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    }, []);
 const downloadAsZip = async () => {
  try {
    const blob = await apiClient.postBlob(
      "/sftp/api/zip-clipboard",
      {
        files: clipboard,
      },
    );

    downloadFileBlob(
      blob,
      `uploady-${Date.now()}.zip`,
    );
  } catch (err) {
    console.error(
      "Failed to download clipboard as ZIP:",
      err,
    );
  }
};

  return (
    <Box
      px={{ base: 3, md: 5 }}
      py="8px"
      mb={2}
      borderBottom="1px solid rgba(251,191,36,0.08)"
      bg="rgba(251,191,36,0.03)"
    >
      <HStack spacing={3} align="center">
        {/* Clipboard icon label */}
        <Icon
          as={FiClipboard}
          boxSize="13px"
          color="rgba(251,191,36,0.4)"
          flexShrink={0}
        />

        {/* File chips */}
        <HStack spacing="6px" flex={1} minW={0} flexWrap="wrap">
          {clipboard.map((item, i) => (
            <HStack
              key={i}
              spacing="5px"
              px="8px"
              h="22px"
              borderRadius="full"
              bg={
                item.action === "cut"
                  ? "rgba(251,146,60,0.08)"
                  : "rgba(251,191,36,0.08)"
              }
              border="1px solid"
              borderColor={
                item.action === "cut"
                  ? "rgba(251,146,60,0.2)"
                  : "rgba(251,191,36,0.15)"
              }
              flexShrink={0}
              cursor="default"
            >
              <Icon
                as={
                  item.action === "cut"
                    ? FiScissors
                    : item.isDirectory
                      ? FiFolder
                      : FiFile
                }
                boxSize="10px"
                color={item.action === "cut" ? "#FB923C" : "#FBBF24"}
              />
              <Text
                fontSize="11px"
                fontFamily="'JetBrains Mono', monospace"
                color={
                  item.action === "cut"
                    ? "rgba(251,146,60,0.9)"
                    : "rgba(255,255,255,0.55)"
                }
                maxW="140px"
                noOfLines={1}
              >
                {item.file}
              </Text>
              <Icon
                as={FiX}
                boxSize="9px"
                color="rgba(255,255,255,0.2)"
                cursor="pointer"
                _hover={{ color: "rgba(255,255,255,0.6)" }}
                onClick={() => removeFromClipboard(item.file, item.path)}
              />
            </HStack>
          ))}
        </HStack>

        {/* Actions */}
        <HStack spacing={2} flexShrink={0}>
          {pasteable && (
            <Flex
              align="center"
              gap={2}
              px={3}
              h="26px"
              borderRadius="6px"
              bg="rgba(251,191,36,0.1)"
              border="1px solid rgba(251,191,36,0.2)"
              color="#FBBF24"
              cursor="pointer"
              fontSize="12px"
              fontWeight={600}
              transition="all 0.12s"
              _hover={{ bg: "rgba(251,191,36,0.18)" }}
              onClick={handlePaste}
            >
              <FiClipboard size={11} />
              Paste
            </Flex>
          )}
          <Flex
            align="center"
            gap={2}
            px={3}
            h="26px"
            borderRadius="6px"
            bg="rgba(251,191,36,0.1)"
            border="1px solid rgba(251,191,36,0.2)"
            color="#FBBF24"
            cursor="pointer"
            fontSize="12px"
            fontWeight={600}
            transition="all 0.12s"
            _hover={{ bg: "rgba(251,191,36,0.18)" }}
            onClick={downloadAsZip}
          >
            <FiClipboard size={11} />
            zip
          </Flex>
          <Flex
            align="center"
            px={3}
            h="26px"
            borderRadius="6px"
            border="1px solid rgba(255,255,255,0.07)"
            color="rgba(255,255,255,0.3)"
            cursor="pointer"
            fontSize="12px"
            fontWeight={500}
            transition="all 0.12s"
            _hover={{
              borderColor: "rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.6)",
            }}
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
