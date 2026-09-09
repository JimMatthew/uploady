import { useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Progress,
  Text,
  Tooltip,
  VStack,
} from "@chakra-ui/react";
import { FiCheck, FiFile, FiUpload, FiX } from "react-icons/fi";

import useFileUpload from "../controllers/useFileUpload";

const formatSize = (bytes) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

function Upload({ apiEndpoint, additionalData = {}, onUploadSuccess }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);

  const { uploadFiles, progresses } = useFileUpload({
    apiEndpoint,
    token: localStorage.getItem("token"),
    additionalData,
  });

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (!selectedFiles.length) {
      return;
    }

    setFiles((current) => [...current, ...selectedFiles]);

    // Allows choosing the same file again later.
    event.target.value = "";
  };

  const handleCancel = (index) => {
    if (uploading) return;

    setFiles((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!files.length || uploading) {
      return;
    }

    setUploading(true);

    try {
      await uploadFiles(files, () => {
        setFiles([]);
        onUploadSuccess?.();
      });
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const hasFiles = files.length > 0;
  const canUpload = hasFiles && !uploading;

  return (
    <Box as="form" onSubmit={handleSubmit} w="100%" maxW="480px">
      <HStack spacing={2}>
        <Box
          as="label"
          flex={1}
          minW={0}
          h="34px"
          px={3}
          display="flex"
          alignItems="center"
          gap={2}
          borderRadius="7px"
          bg="rgba(255,255,255,0.02)"
          border="1px solid"
          borderColor="rgba(255,255,255,0.08)"
          cursor={uploading ? "default" : "pointer"}
          transition="
            background 120ms ease,
            border-color 120ms ease
          "
          _hover={
            uploading
              ? {}
              : {
                  bg: "rgba(255,255,255,0.045)",
                  borderColor: "rgba(255,255,255,0.13)",
                }
          }
        >
          <Icon
            as={FiFile}
            boxSize="12px"
            flexShrink={0}
            color={
              hasFiles ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.24)"
            }
          />

          <Text
            flex={1}
            minW={0}
            noOfLines={1}
            fontSize="11px"
            fontFamily="'JetBrains Mono', monospace"
            color={
              hasFiles ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.3)"
            }
          >
            {hasFiles
              ? `${files.length} ${files.length === 1 ? "file" : "files"} selected`
              : "Choose files…"}
          </Text>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            disabled={uploading}
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </Box>

        <Button
          type="submit"
          h="34px"
          px={3}
          minW="92px"
          flexShrink={0}
          leftIcon={<FiUpload size={12} />}
          borderRadius="7px"
          fontSize="11px"
          fontWeight={600}
          fontFamily="'JetBrains Mono', monospace"
          isDisabled={!canUpload}
          bg={canUpload ? "rgba(129,140,248,0.14)" : "rgba(255,255,255,0.025)"}
          border="1px solid"
          borderColor={
            canUpload ? "rgba(129,140,248,0.24)" : "rgba(255,255,255,0.06)"
          }
          color={canUpload ? "#A5B4FC" : "rgba(255,255,255,0.2)"}
          _hover={
            canUpload
              ? {
                  bg: "rgba(129,140,248,0.2)",
                  borderColor: "rgba(129,140,248,0.34)",
                }
              : {}
          }
          _active={
            canUpload
              ? {
                  bg: "rgba(129,140,248,0.24)",
                }
              : {}
          }
          _disabled={{
            opacity: 1,
            cursor: "not-allowed",
          }}
        >
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </HStack>

      {hasFiles && (
        <VStack
          mt={2}
          spacing={0}
          align="stretch"
          border="1px solid"
          borderColor="rgba(255,255,255,0.07)"
          borderRadius="8px"
          overflow="hidden"
          bg="rgba(255,255,255,0.012)"
        >
          {files.map((file, index) => {
            const progress = progresses[index] ?? 0;
            const done = progress >= 100;

            return (
              <Flex
                key={`${file.name}:${file.size}:${file.lastModified}:${index}`}
                align="center"
                gap={3}
                minH="42px"
                px={3}
                py="7px"
                borderBottom={
                  index < files.length - 1
                    ? "1px solid rgba(255,255,255,0.055)"
                    : "none"
                }
              >
                <Flex
                  align="center"
                  justify="center"
                  w="27px"
                  h="27px"
                  flexShrink={0}
                  borderRadius="6px"
                  bg={
                    done ? "rgba(111,207,151,0.08)" : "rgba(129,140,248,0.07)"
                  }
                  border="1px solid"
                  borderColor={
                    done ? "rgba(111,207,151,0.12)" : "rgba(129,140,248,0.1)"
                  }
                >
                  <Icon
                    as={done ? FiCheck : FiFile}
                    boxSize="12px"
                    color={done ? "#6FCF97" : "#A5B4FC"}
                  />
                </Flex>

                <VStack align="stretch" spacing="4px" flex={1} minW={0}>
                  <HStack spacing={2} w="100%">
                    <Text
                      flex={1}
                      minW={0}
                      noOfLines={1}
                      fontSize="11px"
                      fontWeight={500}
                      fontFamily="'JetBrains Mono', monospace"
                      color="rgba(255,255,255,0.7)"
                    >
                      {file.name}
                    </Text>

                    <Text
                      flexShrink={0}
                      fontSize="10px"
                      fontFamily="'JetBrains Mono', monospace"
                      color="rgba(255,255,255,0.28)"
                    >
                      {formatSize(file.size)}
                    </Text>
                  </HStack>

                  {uploading && (
                    <Progress
                      value={Math.min(progress, 100)}
                      h="3px"
                      w="100%"
                      borderRadius="full"
                      bg="rgba(255,255,255,0.06)"
                      sx={{
                        "& > div": {
                          background: done ? "#6FCF97" : "#818CF8",
                          borderRadius: "999px",
                          transition: "width 0.25s ease",
                        },
                      }}
                    />
                  )}
                </VStack>

                {!uploading && (
                  <Tooltip label="Remove" hasArrow openDelay={400}>
                    <IconButton
                      aria-label={`Remove ${file.name}`}
                      icon={<FiX size={11} />}
                      size="sm"
                      minW="24px"
                      w="24px"
                      h="24px"
                      flexShrink={0}
                      borderRadius="5px"
                      bg="transparent"
                      color="rgba(255,255,255,0.27)"
                      _hover={{
                        bg: "rgba(229,115,115,0.08)",
                        color: "#E57373",
                      }}
                      onClick={() => handleCancel(index)}
                    />
                  </Tooltip>
                )}
              </Flex>
            );
          })}
        </VStack>
      )}
    </Box>
  );
}

export default Upload;
