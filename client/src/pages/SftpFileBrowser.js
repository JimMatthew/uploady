import React, { useMemo } from "react";
import { Box, Flex, Icon, Spinner, Text } from "@chakra-ui/react";

import { FiAlertTriangle, FiWifi } from "react-icons/fi";

import { useSftpFileFolderViewer } from "../hooks/useSftpFileFolderViewer";
import FilePanel from "./FilePanel";

const SftpFileBrowser = ({ serverId, toast, openFile, host }) => {
  const browser = useSftpFileFolderViewer({
    serverId,
    toast,
  });

  const fileUploadProps = useMemo(
    () => ({
      apiEndpoint: "/sftp/api/upload",
      additionalData: {
        serverId,
        currentDirectory: browser.files?.currentDirectory,
      },
      onUploadSuccess: browser.reload,
    }),
    [browser.files?.currentDirectory, browser.reload, serverId],
  );

  const onOpenFile = (filename, isNew) => {
    openFile({
      filename,
      source: {
        type: "sftp",
        serverId,
        currentDirectory: browser.files.currentDirectory,
        host,
      },
      isNew,
    });
  };

  if (browser.loading) {
    return (
      <Flex
        align="center"
        justify="center"
        h="300px"
        direction="column"
        gap={3}
      >
        <Spinner size="sm" color="rgba(129,140,248,0.65)" />

        <Flex align="center" gap={2}>
          <Icon as={FiWifi} boxSize="12px" color="rgba(255,255,255,0.22)" />

          <Text fontSize="12px" color="rgba(255,255,255,0.3)">
            Connecting to{" "}
            <Text
              as="span"
              fontFamily="'JetBrains Mono', monospace"
              color="rgba(255,255,255,0.5)"
            >
              {host}
            </Text>
            …
          </Text>
        </Flex>
      </Flex>
    );
  }

  if (
    !browser.files ||
    !Array.isArray(browser.files.folders) ||
    !Array.isArray(browser.files.files)
  ) {
    return (
      <Flex
        align="center"
        justify="center"
        h="300px"
        direction="column"
        gap={3}
      >
        <Flex
          align="center"
          justify="center"
          w="44px"
          h="44px"
          borderRadius="11px"
          bg="rgba(229,115,115,0.07)"
          border="1px solid"
          borderColor="rgba(229,115,115,0.16)"
        >
          <Icon as={FiAlertTriangle} boxSize="18px" color="#E57373" />
        </Flex>

        <Box textAlign="center">
          <Text
            mb={1}
            fontSize="13px"
            fontWeight={600}
            color="rgba(255,255,255,0.68)"
          >
            Connection failed
          </Text>

          <Text
            fontSize="11px"
            fontFamily="'JetBrains Mono', monospace"
            color="rgba(255,255,255,0.3)"
          >
            {host}
          </Text>
        </Box>
      </Flex>
    );
  }

  return (
    <FilePanel
      browser={browser}
      onOpenFile={onOpenFile}
      fileUploadProps={fileUploadProps}
    />
  );
};

export default SftpFileBrowser;
