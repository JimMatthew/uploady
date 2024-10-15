import React from "react";
import { Box, HStack, Text, Button, Icon, VStack, Stack } from "@chakra-ui/react";
import { FcFile } from "react-icons/fc";

const FileList = ({ files, rp, handleFileDownload, handleFileShareLink, handleFileDelete }) => {
  return (
    <>
      {files && files.length > 0 && files.map((file, index) => (
        <Box
          key={index}
          p={4}
          borderWidth="1px"
          borderRadius="lg"
          _hover={{ shadow: "xl", bg: "gray.50", cursor: "pointer" }}
          transition="all 0.2s"
        >
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <HStack>
                <Icon as={FcFile} boxSize={6} />
                <Text fontWeight="semibold" fontSize="lg" isTruncated>
                  {file.name}
                </Text>
              </HStack>
              <Text fontSize="sm" color="gray.500">
                {file.size} KB | {file.date}
              </Text>
            </VStack>

            <Stack direction={{ base: "column", md: "row" }} spacing={2}>
              <Button size="sm" colorScheme="blue" onClick={() => handleFileDownload(file.name, rp)}>
                Download
              </Button>
              <Button size="sm" colorScheme="blue" onClick={() => handleFileShareLink(file.name, rp)}>
                Share
              </Button>
              <Button size="sm" colorScheme="red" variant="ghost" onClick={() => handleFileDelete(file.name, rp)}>
                Delete
              </Button>
            </Stack>
          </HStack>
        </Box>
      ))}
    </>
  );
};

export default FileList;