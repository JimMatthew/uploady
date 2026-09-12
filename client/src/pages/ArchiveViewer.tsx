import { useCallback, useEffect, useMemo, useState } from "react";
import type { MouseEvent, ReactNode } from "react";

import { Box, Flex, Icon, Spinner, Text } from "@chakra-ui/react";
import type { IconType } from "react-icons";
import { FiArchive, FiCopy, FiFolder } from "react-icons/fi";

import Breadcrumbs from "../components/Breadcrumbs";
import FileItem from "../components/FileItem";
import FolderItem from "../components/FolderItem";
import ItemMenu from "../components/FileMenu";
import ClipboardComponent from "../components/ClipboardComponent";

import apiClient, { ApiError } from "../services/apiClient";
import { useClipboard } from "../contexts/ClipboardContext";
import { getPathName } from "../utils/path";

import type { AppToast } from "../hooks/useAppToast";
import type { BreadcrumbEntry } from "../types/fileBrowser";
import type { ClipboardSourceItem } from "../contexts/ClipboardContext";

interface ArchiveEntry {
  name: string;
  size: number;
  directory: boolean;
}

interface ArchiveResponse {
  entries?: ArchiveEntry[];
}

interface ArchiveFileSource {
  type: "archive";
  archivePath: string;
  entry: string;
}

interface OpenArchiveFileOptions {
  filename: string;
  source: ArchiveFileSource;
  readOnly: true;
}

interface ArchiveViewerProps {
  archivePath: string;
  filename: string;
  toast: AppToast;
  openFile: (options: OpenArchiveFileOptions) => void | Promise<void>;
}

interface ArchiveContextMenu {
  x: number;
  y: number;
  entry: ArchiveEntry | null;
  visible: boolean;
}

interface ArchiveHeaderProps {
  filename: string;
  breadcrumb: BreadcrumbEntry[];
  selectedCount: number;
  onNavigate: (path: string) => void;
  onCopy: () => void;
}

interface ToolbarButtonProps {
  icon: IconType;
  children: ReactNode;
  onClick: () => void;
}

interface ArchiveContentsProps {
  entries: ArchiveEntry[];
  selectedEntryNames: Set<string>;
  onOpen: (entry: ArchiveEntry) => void;
  onSelect: (entry: ArchiveEntry) => void;
  onOpenMenu: (event: MouseEvent<HTMLDivElement>, entry: ArchiveEntry) => void;
}

const ArchiveViewer = ({
  archivePath,
  filename,
  toast,
  openFile,
}: ArchiveViewerProps) => {
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [currentDirectory, setCurrentDirectory] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedEntries, setSelectedEntries] = useState<ArchiveEntry[]>([]);

  const [contextMenu, setContextMenu] = useState<ArchiveContextMenu>({
    x: 0,
    y: 0,
    entry: null,
    visible: false,
  });

  const { copyFile, clipboard } = useClipboard();

  const breadcrumb = useMemo(
    () => buildArchiveBreadcrumb(filename, currentDirectory),
    [filename, currentDirectory],
  );

  const navigateToDirectory = useCallback((path: string): void => {
    const archivePath = path === "/" ? "" : path.replace(/^\/+/, "");

    setCurrentDirectory(archivePath);
    setSelectedEntries([]);
  }, []);

  const loadArchive = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      const path = encodeURIComponent(archivePath);

      const data = await apiClient.get<ArchiveResponse>(
        `/api/archive/local?path=${path}`,
      );

      setEntries(data.entries ?? []);
      setCurrentDirectory("");
      setSelectedEntries([]);
    } catch (error: unknown) {
      console.error("Failed to open archive:", error);

      toast({
        title: "Failed to open archive",
        description:
          error instanceof ApiError
            ? error.message
            : "Unable to read archive contents",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [archivePath, toast]);

  useEffect(() => {
    void loadArchive();
  }, [loadArchive]);

  const visibleEntries = useMemo(
    () => getDirectoryEntries(entries, currentDirectory),
    [entries, currentDirectory],
  );

  const selectedEntryNames = useMemo(
    () => new Set(selectedEntries.map((entry) => entry.name)),
    [selectedEntries],
  );

  const openEntry = useCallback(
    (entry: ArchiveEntry): void => {
      if (entry.directory) {
        setCurrentDirectory(entry.name);
        setSelectedEntries([]);
        return;
      }

      void openFile({
        filename: getPathName(entry.name),
        source: {
          type: "archive",
          archivePath,
          entry: entry.name,
        },
        readOnly: true,
      });
    },
    [archivePath, openFile],
  );

  const toggleEntrySelection = useCallback((entry: ArchiveEntry): void => {
    setSelectedEntries((current) => {
      const selected = current.some((item) => item.name === entry.name);

      if (selected) {
        return current.filter((item) => item.name !== entry.name);
      }

      return [...current, entry];
    });
  }, []);

  const copySelected = useCallback((): void => {
    if (!selectedEntries.length) {
      return;
    }

    copyFile(
      selectedEntries.map((entry) => createClipboardEntry(entry, archivePath)),
    );
  }, [selectedEntries, copyFile, archivePath]);

  const copyArchiveEntry = useCallback(
    (entry: ArchiveEntry | null): void => {
      if (!entry) {
        return;
      }

      copyFile(createClipboardEntry(entry, archivePath));
    },
    [copyFile, archivePath],
  );

  const openMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>, entry: ArchiveEntry): void => {
      event.preventDefault();

      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        entry,
        visible: true,
      });
    },
    [],
  );

  const closeMenu = useCallback((): void => {
    setContextMenu((current) => ({
      ...current,
      visible: false,
    }));
  }, []);

  return (
    <Box
      h="100%"
      display="flex"
      flexDirection="column"
      bg="gray.800"
      overflow="hidden"
    >
      <ArchiveHeader
        filename={filename}
        breadcrumb={breadcrumb}
        selectedCount={selectedEntries.length}
        onNavigate={navigateToDirectory}
        onCopy={copySelected}
      />

      {clipboard[0] && (
        <Box borderBottom="1px solid" borderColor="whiteAlpha.100">
          <ClipboardComponent handlePaste={() => {}} pasteable={false} />
        </Box>
      )}

      <Box flex={1} minH={0} overflowY="auto">
        {loading ? (
          <ArchiveLoadingState />
        ) : (
          <ArchiveContents
            entries={visibleEntries}
            selectedEntryNames={selectedEntryNames}
            onOpen={openEntry}
            onSelect={toggleEntrySelection}
            onOpenMenu={openMenu}
          />
        )}
      </Box>

      {contextMenu.visible && contextMenu.entry && (
        <ItemMenu
          top={contextMenu.y}
          left={contextMenu.x}
          item={getPathName(contextMenu.entry.name)}
          closeMenu={closeMenu}
          openItem={() => openEntry(contextMenu.entry!)}
          copyItem={() => copyArchiveEntry(contextMenu.entry)}
        />
      )}
    </Box>
  );
};

function buildArchiveBreadcrumb(
  filename: string,
  currentDirectory: string,
): BreadcrumbEntry[] {
  const breadcrumb: BreadcrumbEntry[] = [
    {
      name: filename,
      path: "",
    },
  ];

  if (!currentDirectory) {
    return breadcrumb;
  }

  const parts = currentDirectory.replace(/\/+$/, "").split("/");

  let path = "";

  for (const part of parts) {
    path += `${part}/`;

    breadcrumb.push({
      name: part,
      path,
    });
  }

  return breadcrumb;
}

const ArchiveHeader = ({
  filename,
  breadcrumb,
  selectedCount,
  onNavigate,
  onCopy,
}: ArchiveHeaderProps) => {
  return (
    <Box
      flexShrink={0}
      bg="rgba(0,0,0,0.12)"
      borderBottom="1px solid"
      borderColor="whiteAlpha.100"
    >
      <Flex align="center" px={4} py={3} gap={3}>
        <Flex
          align="center"
          justify="center"
          w="34px"
          h="34px"
          flexShrink={0}
          borderRadius="8px"
          bg="rgba(99,102,241,0.12)"
          border="1px solid rgba(129,140,248,0.16)"
          color="#818CF8"
        >
          <Icon as={FiArchive} boxSize="16px" />
        </Flex>

        <Box flex={1} minW={0}>
          <Text
            mb={1.5}
            fontSize="10px"
            fontWeight={600}
            textTransform="uppercase"
            letterSpacing="0.06em"
            color="whiteAlpha.300"
          >
            Archive
          </Text>

          <Breadcrumbs breadcrumb={breadcrumb} onClick={onNavigate} />
        </Box>

        {selectedCount > 0 && (
          <ToolbarButton icon={FiCopy} onClick={onCopy}>
            Copy
            {selectedCount > 1 ? ` ${selectedCount}` : ""}
          </ToolbarButton>
        )}
      </Flex>
    </Box>
  );
};

const ToolbarButton = ({ icon, children, onClick }: ToolbarButtonProps) => (
  <Flex
    as="button"
    type="button"
    align="center"
    gap={1.5}
    h="30px"
    px={2.5}
    borderRadius="6px"
    fontSize="11px"
    fontWeight={500}
    color="whiteAlpha.500"
    transition="background 120ms ease, color 120ms ease"
    _hover={{
      bg: "whiteAlpha.100",
      color: "whiteAlpha.900",
    }}
    _active={{
      bg: "whiteAlpha.200",
    }}
    onClick={onClick}
  >
    <Icon as={icon} boxSize="12px" />

    <Text fontSize="11px">{children}</Text>
  </Flex>
);

const ArchiveLoadingState = () => (
  <Flex
    direction="column"
    align="center"
    justify="center"
    h="100%"
    minH="180px"
    gap={3}
  >
    <Flex
      align="center"
      justify="center"
      w="40px"
      h="40px"
      borderRadius="10px"
      bg="whiteAlpha.50"
    >
      <Spinner size="sm" thickness="2px" color="whiteAlpha.600" />
    </Flex>

    <Box textAlign="center">
      <Text fontSize="12px" fontWeight={500} color="whiteAlpha.700">
        Opening archive
      </Text>

      <Text mt={0.5} fontSize="10px" color="whiteAlpha.300">
        Reading archive contents...
      </Text>
    </Box>
  </Flex>
);

const ArchiveContents = ({
  entries,
  selectedEntryNames,
  onOpen,
  onSelect,
  onOpenMenu,
}: ArchiveContentsProps) => {
  if (!entries.length) {
    return <ArchiveEmptyState />;
  }

  return (
    <Box py={1}>
      {entries.map((entry) => {
        const name = getPathName(entry.name);

        if (entry.directory) {
          return (
            <FolderItem
              key={entry.name}
              folder={name}
              changeDirectory={() => onOpen(entry)}
              onOpenMenu={(event) => onOpenMenu(event, entry)}
            />
          );
        }

        return (
          <FileItem
            key={entry.name}
            name={name}
            size={entry.size / 1024}
            date={null}
            isSelected={selectedEntryNames.has(entry.name)}
            onSelect={() => onSelect(entry)}
            onOpenMenu={(event) => onOpenMenu(event, entry)}
            isRenaming={false}
            onRename={() => {}}
            onRenameClose={() => {}}
          />
        );
      })}
    </Box>
  );
};

const ArchiveEmptyState = () => (
  <Flex
    direction="column"
    align="center"
    justify="center"
    py={16}
    color="whiteAlpha.300"
  >
    <Flex
      align="center"
      justify="center"
      w="42px"
      h="42px"
      mb={3}
      borderRadius="10px"
      bg="whiteAlpha.50"
    >
      <Icon as={FiFolder} boxSize="17px" />
    </Flex>

    <Text fontSize="12px" fontWeight={500} color="whiteAlpha.500">
      Empty folder
    </Text>

    <Text mt={1} fontSize="10px" color="whiteAlpha.300">
      There are no files in this directory.
    </Text>
  </Flex>
);

function getDirectoryEntries(
  entries: ArchiveEntry[],
  currentDirectory: string,
): ArchiveEntry[] {
  return entries
    .filter((entry) => {
      if (!entry.name.startsWith(currentDirectory)) {
        return false;
      }

      const relative = entry.name.slice(currentDirectory.length);

      if (!relative) {
        return false;
      }

      const trimmed = relative.replace(/\/+$/, "");

      return !trimmed.includes("/");
    })
    .sort((a, b) => {
      if (a.directory !== b.directory) {
        return a.directory ? -1 : 1;
      }

      return getPathName(a.name).localeCompare(getPathName(b.name), undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
}

function createClipboardEntry(
  entry: ArchiveEntry,
  archivePath: string,
): ClipboardSourceItem {
  const entryPath = entry.directory
    ? entry.name.replace(/\/+$/, "")
    : entry.name;

  const parts = entryPath.split("/");
  const file = parts.pop() ?? "";
  const path = parts.length ? `${parts.join("/")}/` : "";

  return {
    file,
    path,
    source: "archive",
    archivePath,
    isDirectory: entry.directory,
  };
}

export default ArchiveViewer;
