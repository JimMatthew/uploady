import { useMemo } from "react";
import { Flex, Spinner, Text } from "@chakra-ui/react";
import { useFileList } from "../hooks/useFileList";
import FilePanel from "./FilePanel";
import type { AppToast } from "../hooks/useAppToast";

interface LocalFileSource {
  type: "local";
  currentDirectory: string;
}

interface OpenFileOptions {
  filename: string;
  source: LocalFileSource;
  isNew?: boolean;
}

interface LocalFileBrowserProps {
  toast: AppToast;

  openFile: (options: OpenFileOptions) => void | Promise<void>;
}

interface FileUploadProps {
  apiEndpoint: string;
  additionalData: Record<string, unknown>;
  onUploadSuccess: () => void | Promise<void>;
}

const LocalFileBrowser = ({ toast, openFile }: LocalFileBrowserProps) => {
  const browser = useFileList({
    toast,
  });

  const fileUploadProps = useMemo<FileUploadProps>(
    () => ({
      apiEndpoint: "/api/upload",

      additionalData: {
        folderPath: browser.currentPath,
      },

      onUploadSuccess: () => {
        void browser.reload();
      },
    }),
    [browser.currentPath, browser.reload],
  );

  const onOpenFile = (filename: string, isNew?: boolean): void => {
    void openFile({
      filename,

      source: {
        type: "local",
        currentDirectory: browser.currentPath,
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
