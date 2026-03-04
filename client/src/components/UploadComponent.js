import { useRef, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Progress,
  IconButton,
  Icon,
} from "@chakra-ui/react";
import useFileUpload from "../controllers/useFileUpload";
import { CloseIcon } from "@chakra-ui/icons";
import { FiFile, FiUpload } from "react-icons/fi";

function Upload({ apiEndpoint, additionalData = {}, onUploadSuccess }) {
  const [files, setFiles] = useState([]);
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
    if (!files.length) return;
    await uploadFiles(files, () => {
      setFiles([]);
      onUploadSuccess?.();
    });
    fileInputRef.current.value = null;
  };

  return (
    <Box as="form" onSubmit={handleSubmit} w="100%" maxW="480px">
      {/* Upload row */}
      <HStack spacing={2}>
        {/* File input button */}
        <Box
          as="label"
          flex={1}
          h="36px"
          px={3}
          display="flex"
          alignItems="center"
          gap={2}
          borderRadius="8px"
          bg="rgba(255,255,255,0.04)"
          border="1px solid rgba(255,255,255,0.08)"
          cursor="pointer"
          transition="all 0.15s"
          _hover={{
            bg: "rgba(255,255,255,0.07)",
            borderColor: "rgba(255,255,255,0.15)",
          }}
        >
          <Icon as={FiFile} boxSize="13px" color="rgba(255,255,255,0.3)" />
          <Text
            fontSize="12px"
            fontFamily="'JetBrains Mono', monospace"
            color={
              files.length ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)"
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
          h="36px"
          borderRadius="8px"
          bg={files.length ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)"}
          border={`1px solid ${files.length ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)"}`}
          color={files.length ? "#818CF8" : "rgba(255,255,255,0.25)"}
          cursor={files.length ? "pointer" : "default"}
          fontSize="12px"
          fontWeight={600}
          fontFamily="'JetBrains Mono', monospace"
          transition="all 0.15s"
          flexShrink={0}
          _hover={
            files.length
              ? {
                  bg: "rgba(99,102,241,0.3)",
                  borderColor: "rgba(99,102,241,0.6)",
                }
              : {}
          }
        >
          <Icon as={FiUpload} boxSize="12px" />
          Upload
        </Flex>
      </HStack>

      {/* File list */}
      {files.length > 0 && (
        <VStack spacing={1} mt={2} align="stretch">
          {files.map((file, index) => (
            <Flex
              key={index}
              align="center"
              gap={3}
              px={3}
              py="10px"
              borderRadius="8px"
              bg="rgba(255,255,255,0.03)"
              border="1px solid rgba(255,255,255,0.06)"
            >
              {/* File icon */}
              <Flex
                align="center"
                justify="center"
                w="28px"
                h="28px"
                borderRadius="6px"
                bg="rgba(99,102,241,0.12)"
                flexShrink={0}
              >
                <Icon as={FiFile} boxSize="13px" color="#818CF8" />
              </Flex>

              {/* Name + progress */}
              <VStack align="start" spacing="4px" flex={1} minW={0}>
                <Text
                  fontSize="12px"
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight={600}
                  color="rgba(255,255,255,0.75)"
                  noOfLines={1}
                >
                  {file.name}
                </Text>
                <Progress
                  value={progresses[index] ?? 0}
                  size="xs"
                  w="100%"
                  borderRadius="full"
                  bg="rgba(255,255,255,0.06)"
                  sx={{
                    "& > div": {
                      background: "linear-gradient(90deg, #6366F1, #818CF8)",
                      borderRadius: "full",
                    },
                  }}
                />
              </VStack>

              {/* Cancel */}
              <IconButton
                aria-label="Remove file"
                icon={<CloseIcon boxSize="9px" />}
                size="xs"
                variant="ghost"
                color="rgba(255,255,255,0.2)"
                _hover={{
                  color: "rgba(255,255,255,0.6)",
                  bg: "rgba(255,255,255,0.06)",
                }}
                onClick={() => handleCancel(index)}
                flexShrink={0}
              />
            </Flex>
          ))}
        </VStack>
      )}
    </Box>
  );
}

export default Upload;
