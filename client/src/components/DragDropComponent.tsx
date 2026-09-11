import { useCallback, useState } from "react";
import type { HTMLAttributes } from "react";
import { useDropzone } from "react-dropzone";

import {
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  Progress,
  Text,
  Tooltip,
  VStack,
} from "@chakra-ui/react";

import { FiFile, FiUploadCloud, FiX } from "react-icons/fi";

import useFileUpload from "../controllers/useFileUpload";

interface DragAndDropComponentProps {
  apiEndpoint: string;
  additionalData?: Record<string, unknown>;
  onUploadSuccess?: () => void;
  onUploadError?: (error: unknown) => void;
}

const DragAndDropComponent = ({
  apiEndpoint,
  additionalData = {},
  onUploadSuccess,
  onUploadError,
}: DragAndDropComponentProps) => {
  const [files, setFiles] = useState<File[]>([]);

  const token = localStorage.getItem("token");

  const { uploadFiles, progresses } = useFileUpload({
    apiEndpoint,
    token,
    additionalData,
  });

  const onDrop = useCallback((acceptedFiles: File[]): void => {
    setFiles((current) => [...current, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
  });

  const handleUpload = async (): Promise<void> => {
    if (files.length === 0) {
      return;
    }

    try {
      await uploadFiles(files, () => {
        setFiles([]);

        onUploadSuccess?.();
      });
    } catch (error: unknown) {
      onUploadError?.(error);
    }
  };

  const removeFile = (index: number): void => {
    setFiles((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const hasFiles = files.length > 0;

  return (
    <VStack spacing={3} w="100%" maxW="480px" align="stretch">
      <Box
        {...getRootProps<HTMLAttributes<HTMLDivElement>>()}
        w="100%"
        minH="132px"
        px={4}
        py={5}
        borderRadius="10px"
        border="1px dashed"
        borderColor={
          isDragActive ? "rgba(129,140,248,0.45)" : "rgba(255,255,255,0.11)"
        }
        bg={isDragActive ? "rgba(129,140,248,0.07)" : "rgba(255,255,255,0.018)"}
        cursor="pointer"
        transition="
          background 120ms ease,
          border-color 120ms ease
        "
        _hover={{
          borderColor: isDragActive
            ? "rgba(129,140,248,0.5)"
            : "rgba(255,255,255,0.18)",
          bg: isDragActive
            ? "rgba(129,140,248,0.08)"
            : "rgba(255,255,255,0.028)",
        }}
      >
        <input {...getInputProps()} />

        <Flex
          h="100%"
          minH="90px"
          direction="column"
          align="center"
          justify="center"
          gap={2}
          textAlign="center"
        >
          <Flex
            align="center"
            justify="center"
            w="38px"
            h="38px"
            borderRadius="9px"
            bg={
              isDragActive
                ? "rgba(129,140,248,0.11)"
                : "rgba(255,255,255,0.035)"
            }
            border="1px solid"
            borderColor={
              isDragActive ? "rgba(129,140,248,0.2)" : "rgba(255,255,255,0.06)"
            }
          >
            <Icon
              as={FiUploadCloud}
              boxSize="17px"
              color={isDragActive ? "#A5B4FC" : "rgba(255,255,255,0.32)"}
            />
          </Flex>

          <Text
            fontSize="12px"
            fontWeight={isDragActive ? 600 : 500}
            color={isDragActive ? "#A5B4FC" : "rgba(255,255,255,0.54)"}
          >
            {isDragActive
              ? "Drop files to add them"
              : "Drag files here or click to browse"}
          </Text>

          {!isDragActive && (
            <Text fontSize="10px" color="rgba(255,255,255,0.25)">
              Files will be uploaded to the current directory
            </Text>
          )}
        </Flex>
      </Box>

      {hasFiles && (
        <VStack
          w="100%"
          spacing={0}
          align="stretch"
          border="1px solid"
          borderColor="rgba(255,255,255,0.07)"
          borderRadius="9px"
          overflow="hidden"
          bg="rgba(255,255,255,0.015)"
        >
          {files.map((file, index) => {
            const progress = progresses[index] ?? 0;

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
                  w="28px"
                  h="28px"
                  flexShrink={0}
                  borderRadius="6px"
                  bg="rgba(255,255,255,0.035)"
                >
                  <Icon
                    as={FiFile}
                    boxSize="13px"
                    color="rgba(255,255,255,0.34)"
                  />
                </Flex>

                <Box flex={1} minW={0}>
                  <Flex align="center" justify="space-between" gap={3}>
                    <Text
                      minW={0}
                      fontSize="11px"
                      fontFamily="'JetBrains Mono', monospace"
                      color="rgba(255,255,255,0.72)"
                      noOfLines={1}
                    >
                      {file.name}
                    </Text>

                    <Text
                      flexShrink={0}
                      fontSize="10px"
                      color="rgba(255,255,255,0.3)"
                    >
                      {formatFileSize(file.size)}
                    </Text>
                  </Flex>

                  {progress > 0 && (
                    <Progress
                      value={Math.min(progress, 100)}
                      mt="5px"
                      h="3px"
                      borderRadius="full"
                      bg="rgba(255,255,255,0.06)"
                      sx={{
                        "& > div": {
                          bg: "#818CF8",
                        },
                      }}
                    />
                  )}
                </Box>

                <Tooltip label="Remove" hasArrow openDelay={400}>
                  <IconButton
                    aria-label={`Remove ${file.name}`}
                    icon={<FiX size={12} />}
                    size="sm"
                    minW="24px"
                    w="24px"
                    h="24px"
                    flexShrink={0}
                    borderRadius="5px"
                    bg="transparent"
                    color="rgba(255,255,255,0.28)"
                    _hover={{
                      bg: "rgba(229,115,115,0.08)",
                      color: "#E57373",
                    }}
                    onClick={() => removeFile(index)}
                  />
                </Tooltip>
              </Flex>
            );
          })}
        </VStack>
      )}

      <Button
        w="100%"
        h="38px"
        leftIcon={<FiUploadCloud size={13} />}
        borderRadius="8px"
        fontSize="12px"
        fontWeight={600}
        isDisabled={!hasFiles}
        bg={hasFiles ? "rgba(129,140,248,0.14)" : "rgba(255,255,255,0.025)"}
        border="1px solid"
        borderColor={
          hasFiles ? "rgba(129,140,248,0.24)" : "rgba(255,255,255,0.06)"
        }
        color={hasFiles ? "#A5B4FC" : "rgba(255,255,255,0.2)"}
        _hover={
          hasFiles
            ? {
                bg: "rgba(129,140,248,0.2)",
                borderColor: "rgba(129,140,248,0.34)",
              }
            : {}
        }
        _active={
          hasFiles
            ? {
                bg: "rgba(129,140,248,0.24)",
              }
            : {}
        }
        _disabled={{
          opacity: 1,
          cursor: "not-allowed",
        }}
        onClick={() => {
          void handleUpload();
        }}
      >
        {hasFiles
          ? `Upload ${files.length} ${files.length === 1 ? "file" : "files"}`
          : "Select files to upload"}
      </Button>
    </VStack>
  );
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  const megabytes = kilobytes / 1024;

  if (megabytes < 1024) {
    return `${megabytes.toFixed(1)} MB`;
  }

  return `${(megabytes / 1024).toFixed(2)} GB`;
};

export default DragAndDropComponent;
