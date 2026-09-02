import React, { useMemo } from "react";
import { Box, Flex, Text, Icon, Spinner } from "@chakra-ui/react";
import { FiAlertTriangle, FiWifi } from "react-icons/fi";
import { useSftpFileFolderViewer } from "../hooks/useSftpFileFolderViewer";
import FilePanel from "./FilePanel";

const SftpFileBrowser = ({ serverId, toast, openFile, host }) => {
  const browser = useSftpFileFolderViewer({ serverId, toast });

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

  const onOpenFile = (filename, isNew) =>
    openFile(
      serverId,
      browser.files.currentDirectory,
      filename,
      host,
      true,
      isNew,
    );

  if (browser.loading)
    return (
      <Flex
        align="center"
        justify="center"
        h="300px"
        direction="column"
        gap={3}
      >
        <Box position="relative">
          <Spinner size="sm" color="rgba(99,102,241,0.5)" />
          <Box
            position="absolute"
            inset={0}
            borderRadius="full"
            boxShadow="0 0 12px rgba(99,102,241,0.3)"
          />
        </Box>
        <Flex align="center" gap={2}>
          <Icon as={FiWifi} boxSize="12px" color="rgba(255,255,255,0.2)" />
          <Text fontSize="12px" color="rgba(255,255,255,0.25)">
            Connecting to{" "}
            <Text
              as="span"
              fontFamily="'JetBrains Mono', monospace"
              color="rgba(255,255,255,0.45)"
            >
              {host}
            </Text>
            …
          </Text>
        </Flex>
      </Flex>
    );

  if (
    !browser.files ||
    !Array.isArray(browser.files.folders) ||
    !Array.isArray(browser.files.files)
  )
    return (
      <Flex
        align="center"
        justify="center"
        h="300px"
        direction="column"
        gap={3}
      >
        <Box
          w="44px"
          h="44px"
          borderRadius="11px"
          bg="rgba(239,68,68,0.08)"
          border="1px solid rgba(239,68,68,0.2)"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Icon
            as={FiAlertTriangle}
            boxSize="18px"
            color="rgba(239,68,68,0.7)"
          />
        </Box>
        <Box textAlign="center">
          <Text
            fontSize="13px"
            fontWeight={600}
            color="rgba(255,255,255,0.6)"
            mb={1}
          >
            Connection failed
          </Text>
          <Text
            fontSize="12px"
            color="rgba(255,255,255,0.25)"
            fontFamily="'JetBrains Mono', monospace"
          >
            {host}
          </Text>
        </Box>
      </Flex>
    );

  return (
    <FilePanel
      browser={browser}
      onOpenFile={onOpenFile}
      fileUploadProps={fileUploadProps}
    />
  );
};

export default SftpFileBrowser;
