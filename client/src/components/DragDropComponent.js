import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Box, VStack, HStack, Text, Flex, Icon, Progress } from "@chakra-ui/react";
import { FiUploadCloud, FiFile, FiX } from "react-icons/fi";
import useFileUpload from "../controllers/useFileUpload";

const DragAndDropComponent = ({ apiEndpoint, additionalData = {}, onUploadSuccess, onUploadError }) => {
  const [files, setFiles] = useState([]);
  const token = localStorage.getItem("token");
  const { uploadFiles, progresses } = useFileUpload({ apiEndpoint, token, additionalData });

  const onDrop = useCallback((accepted) => setFiles((f) => [...f, ...accepted]), []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleUpload = () => uploadFiles(files, () => { setFiles([]); onUploadSuccess(); });
  const removeFile = (i) => setFiles((f) => f.filter((_, idx) => idx !== i));

  return (
    <VStack spacing={3} w="100%" maxW="480px">
      {/* Drop zone */}
      <Box
        {...getRootProps()}
        w="100%"
        h="140px"
        borderRadius="12px"
        border="1px dashed"
        borderColor={isDragActive ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.1)"}
        bg={isDragActive ? "rgba(99,102,241,0.07)" : "rgba(255,255,255,0.02)"}
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap={2}
        cursor="pointer"
        transition="all 0.15s"
        _hover={{ borderColor: "rgba(255,255,255,0.2)", bg: "rgba(255,255,255,0.03)" }}
      >
        <input {...getInputProps()} />
        <Icon
          as={FiUploadCloud}
          boxSize={isDragActive ? "32px" : "28px"}
          color={isDragActive ? "#6366F1" : "rgba(255,255,255,0.25)"}
          transition="all 0.15s"
        />
        <Text fontSize="13px" color={isDragActive ? "#818CF8" : "rgba(255,255,255,0.35)"} fontWeight={isDragActive ? 600 : 400}>
          {isDragActive ? "Drop to add files" : "Drag files here or click to browse"}
        </Text>
      </Box>

      {/* File list */}
      {files.length > 0 && (
        <VStack w="100%" spacing={1} align="stretch">
          {files.map((file, i) => (
            <Flex
              key={i}
              align="center"
              px={3}
              py="8px"
              gap={3}
              bg="rgba(255,255,255,0.03)"
              border="1px solid rgba(255,255,255,0.07)"
              borderRadius="8px"
            >
              <Icon as={FiFile} boxSize="14px" color="rgba(255,255,255,0.3)" flexShrink={0} />
              <Box flex={1} minW={0}>
                <Text fontSize="12px" fontFamily="'JetBrains Mono', monospace" color="rgba(255,255,255,0.7)" noOfLines={1}>
                  {file.name}
                </Text>
                {progresses[i] > 0 && (
                  <Progress
                    value={progresses[i]}
                    size="xs"
                    mt="4px"
                    borderRadius="full"
                    bg="rgba(255,255,255,0.07)"
                    sx={{ "& > div": { bg: "#6366F1" } }}
                  />
                )}
              </Box>
              <Text fontSize="10px" color="rgba(255,255,255,0.2)" flexShrink={0}>
                {(file.size / 1024).toFixed(1)}k
              </Text>
              <Flex
                w="20px" h="20px"
                align="center" justify="center"
                borderRadius="4px"
                cursor="pointer"
                color="rgba(255,255,255,0.25)"
                transition="all 0.12s"
                _hover={{ bg: "rgba(239,68,68,0.15)", color: "#EF4444" }}
                onClick={() => removeFile(i)}
                flexShrink={0}
              >
                <FiX size={12} />
              </Flex>
            </Flex>
          ))}
        </VStack>
      )}

      {/* Upload button */}
      <Flex
        as="button"
        w="100%"
        h="40px"
        align="center"
        justify="center"
        gap={2}
        borderRadius="9px"
        bg={files.length === 0 ? "rgba(255,255,255,0.03)" : "rgba(99,102,241,0.2)"}
        border="1px solid"
        borderColor={files.length === 0 ? "rgba(255,255,255,0.07)" : "rgba(99,102,241,0.35)"}
        color={files.length === 0 ? "rgba(255,255,255,0.2)" : "#818CF8"}
        cursor={files.length === 0 ? "not-allowed" : "pointer"}
        fontSize="13px"
        fontWeight={600}
        transition="all 0.15s"
        _hover={files.length > 0 ? { bg: "rgba(99,102,241,0.3)" } : {}}
        onClick={files.length > 0 ? handleUpload : undefined}
      >
        <FiUploadCloud size={14} />
        Upload {files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""}` : ""}
      </Flex>
    </VStack>
  );
};

export default DragAndDropComponent;