import { useMemo } from "react";
import { Box, Flex, Icon, Spinner, Text } from "@chakra-ui/react";
import { FiAlertTriangle, FiWifi } from "react-icons/fi";
import { useSftpFileFolderViewer } from "../hooks/useSftpFileFolderViewer";
import FilePanel from "./FilePanel";

import type { AppToast } from "../hooks/useAppToast";
import type { FileUploadProps } from "../types/fileBrowser";
import { OpenFileOptions, SftpFileSource } from "../types/workspace";

interface SftpFileBrowserProps {
  serverId: string;
  host: string;
  toast: AppToast;

  openFile: (
    options: OpenFileOptions<SftpFileSource>,
  ) => void | Promise<void>;
}

const SftpFileBrowser = ({
  serverId,
  toast,
  openFile,
  host,
}: SftpFileBrowserProps) => {
  const browser = useSftpFileFolderViewer({
    serverId,
    toast,
  });

  const fileUploadProps = useMemo<FileUploadProps>(
    () => ({
      apiEndpoint: "/sftp/api/upload",

      additionalData: {
        serverId,
        currentDirectory: browser.currentPath,
      },

      onUploadSuccess: () => {
        void browser.reload();
      },
    }),
    [browser.currentPath, browser.reload, serverId],
  );

  const onOpenFile = (filename: string, isNew?: boolean): void => {
    void openFile({
      filename,

      source: {
        type: "sftp",
        serverId,
        currentDirectory: browser.currentPath,
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

  if (browser.error) {
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

          <Text mt={1} fontSize="11px" color="rgba(255,255,255,0.32)">
            {browser.error}
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
      toast={toast}
    />
  );
};

export default SftpFileBrowser;
