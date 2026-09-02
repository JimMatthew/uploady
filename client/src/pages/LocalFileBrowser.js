import React, { useMemo, useCallback } from "react";
import { Box, Flex, Text, Icon, Spinner } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { FiServer, FiArrowRight } from "react-icons/fi";
import { useFileList } from "../hooks/useFileList";
import FilePanel from "./FilePanel";

const LocalFileBrowser= ({ toast, hideLink = false, openFile }) => {
  const browser = useFileList({ toast });

  const fileUploadProps = useMemo(
    () => ({
      apiEndpoint: "/api/upload",
      additionalData: { folderPath: browser.files?.relativePath },
      onUploadSuccess: browser.reload,
    }),
    [browser.files?.relativePath, browser.reload],
  );

  const onOpenFile = (filename, isNew) => {
    openFile(null, browser.files.relativePath, filename, null, false, isNew);
  };

  if (browser.loading || !browser.files)
    return (
      <Flex
        align="center"
        justify="center"
        h="300px"
        direction="column"
        gap={3}
      >
        <Spinner size="sm" color="rgba(99,102,241,0.6)" />
        <Text fontSize="12px" color="rgba(255,255,255,0.25)">
          Loading files…
        </Text>
      </Flex>
    );

  return (
    <>
      {/* SFTP link banner */}
      {!hideLink && (
        <Flex
          align="center"
          justify="space-between"
          mx={{ base: 3, md: 5 }}
          mt={4}
          mb={2}
          px={4}
          py={3}
          borderRadius="9px"
          bg="rgba(99,102,241,0.06)"
          border="1px solid rgba(99,102,241,0.15)"
        >
          <Flex align="center" gap={2}>
            <Icon as={FiServer} boxSize="14px" color="rgba(99,102,241,0.7)" />
            <Text fontSize="12px" color="rgba(255,255,255,0.45)">
              Manage remote SFTP servers
            </Text>
          </Flex>
          <Link to="/api/sftp">
            <Flex
              align="center"
              gap={1}
              fontSize="12px"
              fontWeight={600}
              color="#818CF8"
              _hover={{ color: "#A5B4FC" }}
              transition="color 0.12s"
            >
              SFTP Servers
              <Icon as={FiArrowRight} boxSize="12px" />
            </Flex>
          </Link>
        </Flex>
      )}

      <FilePanel
        browser={browser}
        onOpenFile={onOpenFile}
        fileUploadProps={fileUploadProps}
      />
    </>
  );
};

export default LocalFileBrowser;
