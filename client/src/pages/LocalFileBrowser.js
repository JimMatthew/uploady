import React, { useMemo } from "react";
import { Flex, Text, Spinner } from "@chakra-ui/react";
import { useFileList } from "../hooks/useFileList";
import FilePanel from "./FilePanel";

const LocalFileBrowser = ({ toast, openFile }) => {
  const browser = useFileList({ toast });

  const fileUploadProps = useMemo(
    () => ({
      apiEndpoint: "/api/upload",
      additionalData: {
        folderPath: browser.files?.relativePath,
      },
      onUploadSuccess: browser.reload,
    }),
    [browser.files?.relativePath, browser.reload],
  );

  const onOpenFile = (filename, isNew) => {
    openFile({
      filename,
      source: {
        type: "local",
        currentDirectory: browser.files.relativePath,
      },
      isNew,
    });
  };

  if (browser.loading || !browser.files) {
    return (
      <Flex
        align="center"
        justify="center"
        h="300px"
        direction="column"
        gap={3}
      >
        <Spinner size="sm" color="rgba(129,140,248,0.65)" />

        <Text fontSize="12px" color="rgba(255,255,255,0.25)">
          Loading files…
        </Text>
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

export default LocalFileBrowser;
