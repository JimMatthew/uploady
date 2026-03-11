import { useRef, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Progress,
  Icon,
} from "@chakra-ui/react";
import useFileUpload from "../controllers/useFileUpload";
import { FiFile, FiUpload, FiX, FiCheck } from "react-icons/fi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── Component ────────────────────────────────────────────────────────────────

function Upload({ apiEndpoint, additionalData = {}, onUploadSuccess }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const { uploadFiles, progresses } = useFileUpload({
    apiEndpoint,
    token: localStorage.getItem("token"),
    additionalData,
  });

  const handleFileChange = (e) => {
    setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
  };

  const handleCancel = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.length || uploading) return;
    setUploading(true);
    await uploadFiles(files, () => {
      setFiles([]);
      setUploading(false);
      onUploadSuccess?.();
    });
    if (fileInputRef.current) fileInputRef.current.value = null;
    setUploading(false);
  };

  return (
    <Box as="form" onSubmit={handleSubmit} w="100%" maxW="480px">
      {/* Upload row */}
      <HStack spacing={2}>
        {/* File picker */}
        <Box
          as="label"
          flex={1}
          h="34px"
          px={3}
          display="flex"
          alignItems="center"
          gap={2}
          borderRadius="8px"
          bg="rgba(255,255,255,0.03)"
          border="1px solid rgba(255,255,255,0.07)"
          cursor="pointer"
          transition="all 0.15s"
          _hover={{
            bg: "rgba(255,255,255,0.06)",
            borderColor: "rgba(255,255,255,0.14)",
          }}
        >
          <Icon as={FiFile} boxSize="12px" color="rgba(255,255,255,0.25)" />
          <Text
            fontSize="12px"
            fontFamily="'JetBrains Mono', monospace"
            color={
              files.length ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.25)"
            }
            noOfLines={1}
            flex={1}
          >
            {files.length
              ? `${files.length} file${files.length > 1 ? "s" : ""} selected`
              : "Choose files…"}
          </Text>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </Box>

        {/* Upload button */}
        <Flex
          as="button"
          type="submit"
          align="center"
          gap="6px"
          px={3}
          h="34px"
          borderRadius="8px"
          bg={
            files.length && !uploading
              ? "rgba(99,102,241,0.18)"
              : "rgba(255,255,255,0.03)"
          }
          border="1px solid"
          borderColor={
            files.length && !uploading
              ? "rgba(99,102,241,0.35)"
              : "rgba(255,255,255,0.07)"
          }
          color={
            files.length && !uploading ? "#818CF8" : "rgba(255,255,255,0.2)"
          }
          cursor={files.length && !uploading ? "pointer" : "default"}
          fontSize="12px"
          fontWeight={600}
          fontFamily="'JetBrains Mono', monospace"
          transition="all 0.15s"
          flexShrink={0}
          _hover={
            files.length && !uploading
              ? {
                  bg: "rgba(99,102,241,0.28)",
                  borderColor: "rgba(99,102,241,0.5)",
                }
              : {}
          }
        >
          <Icon as={FiUpload} boxSize="12px" />
          {uploading ? "Uploading…" : "Upload"}
        </Flex>
      </HStack>

      {/* File list */}
      {files.length > 0 && (
        <VStack spacing={1} mt={2} align="stretch">
          {files.map((file, index) => {
            const progress = progresses[index] ?? 0;
            const done = progress === 100;

            return (
              <Flex
                key={index}
                align="center"
                gap={3}
                px={3}
                py="8px"
                borderRadius="8px"
                bg="rgba(255,255,255,0.02)"
                border="1px solid"
                borderColor={
                  done ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)"
                }
                transition="border-color 0.2s"
              >
                {/* File icon */}
                <Flex
                  align="center"
                  justify="center"
                  w="26px"
                  h="26px"
                  borderRadius="6px"
                  bg={done ? "rgba(34,197,94,0.1)" : "rgba(99,102,241,0.1)"}
                  flexShrink={0}
                  transition="all 0.2s"
                >
                  <Icon
                    as={done ? FiCheck : FiFile}
                    boxSize="12px"
                    color={done ? "#22C55E" : "#818CF8"}
                  />
                </Flex>

                {/* Name + size + progress */}
                <VStack align="start" spacing="3px" flex={1} minW={0}>
                  <HStack spacing={2} w="100%">
                    <Text
                      fontSize="12px"
                      fontFamily="'JetBrains Mono', monospace"
                      fontWeight={500}
                      color="rgba(255,255,255,0.7)"
                      noOfLines={1}
                      flex={1}
                      minW={0}
                    >
                      {file.name}
                    </Text>
                    <Text
                      fontSize="10px"
                      fontFamily="'JetBrains Mono', monospace"
                      color="rgba(255,255,255,0.25)"
                      flexShrink={0}
                    >
                      {formatSize(file.size)}
                    </Text>
                  </HStack>

                  {/* Progress bar — only shown during upload */}
                  {uploading && (
                    <Progress
                      value={progress}
                      size="xs"
                      w="100%"
                      borderRadius="full"
                      bg="rgba(255,255,255,0.06)"
                      sx={{
                        "& > div": {
                          background: done
                            ? "#22C55E"
                            : "linear-gradient(90deg, #6366F1, #818CF8)",
                          borderRadius: "full",
                          transition: "width 0.3s ease",
                        },
                      }}
                    />
                  )}
                </VStack>

                {/* Cancel — hidden while uploading */}
                {!uploading && (
                  <Flex
                    w="22px"
                    h="22px"
                    align="center"
                    justify="center"
                    borderRadius="5px"
                    cursor="pointer"
                    color="rgba(255,255,255,0.2)"
                    transition="all 0.12s"
                    flexShrink={0}
                    _hover={{
                      bg: "rgba(239,68,68,0.1)",
                      color: "#EF4444",
                    }}
                    onClick={() => handleCancel(index)}
                  >
                    <Icon as={FiX} boxSize="11px" />
                  </Flex>
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
