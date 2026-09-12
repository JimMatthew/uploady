import { useCallback } from "react";

import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Text,
  Tooltip,
} from "@chakra-ui/react";

import {
  FiArchive,
  FiClipboard,
  FiFile,
  FiFolder,
  FiScissors,
  FiTrash2,
  FiX,
} from "react-icons/fi";

import {
  useClipboard,
  type ClipboardItem as ClipboardItemType,
} from "../contexts/ClipboardContext";

import apiClient from "../services/apiClient";

const CLIPBOARD_ACCENT = "#D6A85F";
const CUT_ACCENT = "#E59A5A";

interface ClipboardItemProps {
  item: ClipboardItemType;

  onRemove: (file: string, filePath: string) => void;
}

interface ClipboardComponentProps {
  handlePaste: () => void | Promise<void>;
  pasteable?: boolean;
}

const ClipboardItem = ({ item, onRemove }: ClipboardItemProps) => {
  const isCut = item.action === "cut";

  const icon = isCut ? FiScissors : item.isDirectory ? FiFolder : FiFile;

  return (
    <Flex
      align="center"
      gap="6px"
      h="26px"
      px="8px"
      minW={0}
      maxW="190px"
      borderRadius="7px"
      bg={isCut ? "rgba(229,154,90,0.07)" : "rgba(214,168,95,0.06)"}
      border="1px solid"
      borderColor={isCut ? "rgba(229,154,90,0.16)" : "rgba(214,168,95,0.14)"}
    >
      <Icon
        as={icon}
        boxSize="10px"
        flexShrink={0}
        color={isCut ? CUT_ACCENT : CLIPBOARD_ACCENT}
      />

      <Text
        minW={0}
        flex={1}
        fontSize="11px"
        fontFamily="'JetBrains Mono', monospace"
        color={isCut ? "rgba(229,154,90,0.85)" : "rgba(255,255,255,0.58)"}
        noOfLines={1}
      >
        {item.file}
      </Text>

      <Tooltip label="Remove" hasArrow openDelay={400}>
        <Flex
          as="button"
          type="button"
          align="center"
          justify="center"
          w="18px"
          h="18px"
          flexShrink={0}
          borderRadius="5px"
          color="rgba(255,255,255,0.22)"
          transition="all 120ms ease"
          aria-label={`Remove ${item.file}`}
          onClick={() => onRemove(item.file, item.path)}
          _hover={{
            bg: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.65)",
          }}
        >
          <FiX size={9} />
        </Flex>
      </Tooltip>
    </Flex>
  );
};

const ClipboardComponent = ({
  handlePaste,
  pasteable = true,
}: ClipboardComponentProps) => {
  const { clipboard, clearClipboard, removeFromClipboard } = useClipboard();

  const downloadFileBlob = useCallback((blob: Blob, filename: string): void => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 5000);
  }, []);

  const downloadAsZip = async (): Promise<void> => {
    try {
      const blob = await apiClient.postBlob("/sftp/api/zip-clipboard", {
        files: clipboard,
      });

      downloadFileBlob(blob, `uploady-${Date.now()}.zip`);
    } catch (error: unknown) {
      console.error("Failed to download clipboard as ZIP:", error);
    }
  };

  return (
    <Box
      px={{
        base: 3,
        md: 5,
      }}
      py="10px"
      mb={2}
      bg="rgba(255,255,255,0.018)"
      borderBottom="1px solid"
      borderColor="rgba(255,255,255,0.06)"
    >
      <Flex
        align={{
          base: "flex-start",
          lg: "center",
        }}
        direction={{
          base: "column",
          lg: "row",
        }}
        gap={3}
      >
        {/* Clipboard identity */}
        <Flex align="center" gap={2} flexShrink={0}>
          <Flex
            align="center"
            justify="center"
            w="26px"
            h="26px"
            borderRadius="7px"
            bg="rgba(214,168,95,0.08)"
            border="1px solid rgba(214,168,95,0.14)"
          >
            <Icon as={FiClipboard} boxSize="11px" color={CLIPBOARD_ACCENT} />
          </Flex>

          <Box>
            <Text
              fontSize="11px"
              fontWeight={600}
              color="rgba(255,255,255,0.68)"
              lineHeight={1.1}
            >
              Clipboard
            </Text>

            <Text mt="2px" fontSize="10px" color="rgba(255,255,255,0.28)">
              {clipboard.length} {clipboard.length === 1 ? "item" : "items"}
            </Text>
          </Box>
        </Flex>

        {/* Clipboard items */}
        <Flex flex={1} minW={0} gap="6px" flexWrap="wrap">
          {clipboard.map((item) => (
            <ClipboardItem
              key={`${item.path}:${item.file}`}
              item={item}
              onRemove={removeFromClipboard}
            />
          ))}
        </Flex>

        {/* Actions */}
        <HStack spacing="6px" flexShrink={0}>
          {pasteable && (
            <Button
              size="xs"
              h="30px"
              px={3}
              leftIcon={<Icon as={FiClipboard} boxSize="11px" />}
              borderRadius="7px"
              bg="rgba(99,102,241,0.12)"
              border="1px solid"
              borderColor="rgba(129,140,248,0.25)"
              color="#A5B4FC"
              fontSize="11px"
              fontWeight={600}
              onClick={() => {
                void handlePaste();
              }}
              _hover={{
                bg: "rgba(99,102,241,0.2)",
                borderColor: "rgba(129,140,248,0.4)",
                color: "#C7D2FE",
              }}
              _active={{
                bg: "rgba(99,102,241,0.26)",
              }}
            >
              Paste
            </Button>
          )}

          <Button
            size="xs"
            h="30px"
            px={3}
            leftIcon={<Icon as={FiArchive} boxSize="11px" />}
            variant="ghost"
            border="1px solid"
            borderColor="rgba(255,255,255,0.08)"
            borderRadius="7px"
            color="rgba(255,255,255,0.52)"
            fontSize="11px"
            fontWeight={500}
            onClick={() => {
              void downloadAsZip();
            }}
            _hover={{
              bg: "rgba(255,255,255,0.05)",
              borderColor: "rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.82)",
            }}
          >
            Download ZIP
          </Button>

          <Tooltip label="Clear clipboard" hasArrow openDelay={400}>
            <Button
              size="xs"
              minW="30px"
              w="30px"
              h="30px"
              p={0}
              variant="ghost"
              borderRadius="7px"
              color="rgba(255,255,255,0.28)"
              aria-label="Clear clipboard"
              onClick={clearClipboard}
              _hover={{
                bg: "rgba(229,115,115,0.08)",
                color: "#E57373",
              }}
            >
              <FiTrash2 size={11} />
            </Button>
          </Tooltip>
        </HStack>
      </Flex>
    </Box>
  );
};

export default ClipboardComponent;
