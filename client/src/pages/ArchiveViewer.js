import React, { useCallback, useEffect, useState } from "react";

import { Box, Flex, Text, Spinner, Icon } from "@chakra-ui/react";
import FileItem from "../components/FileItem";
import FolderItem from "../components/FolderItem";
import {
  FiArchive,
  FiFolder,
  FiFile,
  FiArrowLeft,
  FiCopy,
} from "react-icons/fi";
import ItemMenu from "../components/FileMenu";
import ClipboardComponent from "../components/ClipboardComponent";
import apiClient from "../services/apiClient";
import { useClipboard } from "../contexts/ClipboardContext";

const ArchiveViewer = ({ archivePath, filename, toast, openFile }) => {
  const [entries, setEntries] = useState([]);
  const [currentDirectory, setCurrentDirectory] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [contextMenu, setContextMenu] = useState({
    x: 0,
    y: 0,
    entry: null,
    visible: false,
  });
  const { copyFile, clipboard } = useClipboard();

  const loadArchive = useCallback(async () => {
    setLoading(true);

    try {
      const path = encodeURIComponent(archivePath);

      const data = await apiClient.get(`/api/archive/local?path=${path}`);

      setEntries(data.entries ?? []);
      setCurrentDirectory("");
    } catch (err) {
      console.error("Failed to open archive:", err);

      toast?.({
        title: "Failed to open archive",
        description: err.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [archivePath, toast]);

  useEffect(() => {
    loadArchive();
  }, [loadArchive]);

  const visibleEntries = getDirectoryEntries(entries, currentDirectory);

  const openEntry = (entry) => {
    if (entry.directory) {
      setCurrentDirectory(entry.name);
      setSelectedEntries([]);
      return;
    }

    const entryFilename = entry.name.replace(/\/$/, "").split("/").pop();

    openFile({
      filename: entryFilename,
      source: {
        type: "archive",
        archivePath,
        entry: entry.name,
      },
      readOnly: true,
    });
  };

  const goBack = () => {
    if (!currentDirectory) {
      return;
    }

    const path = currentDirectory.replace(/\/$/, "").split("/");

    path.pop();

    const parent = path.length ? `${path.join("/")}/` : "";

    setCurrentDirectory(parent);
    setSelectedEntries([]);
  };

  const toggleEntrySelection = useCallback((entry) => {
    setSelectedEntries((prev) => {
      const exists = prev.some((selected) => selected.name === entry.name);

      if (exists) {
        return prev.filter((selected) => selected.name !== entry.name);
      }

      return [...prev, entry];
    });
  }, []);

  const copySelected = useCallback(() => {
    if (selectedEntries.length === 0) {
      return;
    }

    const items = selectedEntries.map((entry) => {
      const entryPath = entry.directory
        ? entry.name.replace(/\/+$/, "")
        : entry.name;

      const parts = entryPath.split("/");
      const file = parts.pop();

      const path = parts.length ? `${parts.join("/")}/` : "";

      return {
        file,
        path,
        source: "archive",
        archivePath,
        isDirectory: entry.directory,
      };
    });

    copyFile(items);
  }, [selectedEntries, copyFile, archivePath]);

  const copyArchiveEntry = useCallback(
    (entry) => {
      if (!entry) {
        return;
      }

      const entryPath = entry.directory
        ? entry.name.replace(/\/+$/, "")
        : entry.name;

      const parts = entryPath.split("/");
      const file = parts.pop();
      const path = parts.length ? `${parts.join("/")}/` : "";

      copyFile({
        file,
        path,
        source: "archive",
        archivePath,
        isDirectory: entry.directory,
      });
    },
    [copyFile, archivePath],
  );
  const openMenu = useCallback((e, entry) => {
    e.preventDefault();

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      entry,
      visible: true,
    });
  }, []);

  const closeMenu = useCallback(() => {
    setContextMenu((m) => ({
      ...m,
      visible: false,
    }));
  }, []);
  return (
    <Box h="100%" display="flex" flexDirection="column" bg="gray.800">
      <ArchiveHeader
        filename={filename}
        currentDirectory={currentDirectory}
        canGoBack={currentDirectory !== ""}
        onBack={goBack}
        onCopy={copySelected}
        selectedCount={selectedEntries.length}
      />

      {clipboard[0] && <ClipboardComponent pasteable={false} />}

      <Box flex={1} overflowY="auto">
        {loading ? (
          <Flex align="center" justify="center" h="100%" gap={3}>
            <Spinner size="sm" />

            <Text fontSize="12px" color="rgba(255,255,255,0.35)">
              Opening archive...
            </Text>
          </Flex>
        ) : (
          <ArchiveContents
            entries={visibleEntries}
            onOpen={openEntry}
            selectedEntries={selectedEntries}
            onSelect={toggleEntrySelection}
            onOpenMenu={openMenu}
          />
        )}
        {contextMenu.visible && (
          <ItemMenu
            top={contextMenu.y}
            left={contextMenu.x}
            item={getEntryName(contextMenu.entry.name)}
            closeMenu={closeMenu}
            openItem={() => openEntry(contextMenu.entry)}
            copyItem={() => copyArchiveEntry(contextMenu.entry)}
          />
        )}
      </Box>
    </Box>
  );
};

const ArchiveHeader = ({
  filename,
  currentDirectory,
  canGoBack,
  onBack,
  onCopy,
  selectedCount,
}) => {
  return (
    <Flex
      align="center"
      gap={3}
      px={4}
      py={3}
      borderBottom="1px solid rgba(255,255,255,0.06)"
      flexShrink={0}
    >
      <Flex
        align="center"
        justify="center"
        w="28px"
        h="28px"
        borderRadius="6px"
        bg="rgba(99,102,241,0.1)"
        color="#818CF8"
      >
        <Icon as={FiArchive} boxSize="14px" />
      </Flex>

      <Box minW={0} flex={1}>
        <Text fontSize="12px" fontWeight={600} color="rgba(255,255,255,0.8)">
          {filename}
        </Text>

        <Text
          fontSize="10px"
          fontFamily="'JetBrains Mono', monospace"
          color="rgba(255,255,255,0.3)"
          whiteSpace="nowrap"
          overflow="hidden"
          textOverflow="ellipsis"
        >
          /{currentDirectory}
        </Text>
      </Box>

      {selectedCount > 0 && (
        <Flex
          as="button"
          align="center"
          gap={2}
          px={3}
          py={1.5}
          borderRadius="6px"
          color="rgba(255,255,255,0.45)"
          _hover={{
            bg: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.8)",
          }}
          onClick={onCopy}
        >
          <Icon as={FiCopy} boxSize="13px" />

          <Text fontSize="11px">
            Copy
            {selectedCount > 1 ? ` (${selectedCount})` : ""}
          </Text>
        </Flex>
      )}
      {canGoBack && (
        <Flex
          as="button"
          align="center"
          gap={2}
          px={3}
          py={1.5}
          borderRadius="6px"
          color="rgba(255,255,255,0.45)"
          _hover={{
            bg: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.8)",
          }}
          onClick={onBack}
        >
          <Icon as={FiArrowLeft} boxSize="13px" />

          <Text fontSize="11px">Back</Text>
        </Flex>
      )}
    </Flex>
  );
};

const ArchiveContents = ({
  entries,
  onOpen,
  selectedEntries,
  onSelect,
  onOpenMenu,
}) => {
  if (entries.length === 0) {
    return (
      <Flex align="center" justify="center" py={12}>
        <Text fontSize="12px" color="rgba(255,255,255,0.3)">
          This folder is empty.
        </Text>
      </Flex>
    );
  }

  return (
    <Box>
      {entries.map((entry) => {
        if (entry.directory) {
          return (
            <FolderItem
              key={entry.name}
              folder={getEntryName(entry.name)}
              changeDirectory={() => onOpen(entry)}
              onOpenMenu={(e) => onOpenMenu(e, entry)}
            />
          );
        }

        return (
          <FileItem
            key={entry.name}
            name={getEntryName(entry.name)}
            size={entry.size / 1024}
            date={null}
            isSelected={selectedEntries.some(
              (selected) => selected.name === entry.name,
            )}
            onSelect={() => onSelect(entry)}
            onOpenMenu={(e) => onOpenMenu(e, entry)}
            isRenaming={false}
            onRename={() => {}}
            onRenameClose={() => {}}
          />
        );
      })}
    </Box>
  );
};

function getDirectoryEntries(entries, currentDirectory) {
  return entries
    .filter((entry) => {
      if (!entry.name.startsWith(currentDirectory)) {
        return false;
      }

      const relative = entry.name.slice(currentDirectory.length);

      if (!relative) {
        return false;
      }

      const trimmed = relative.endsWith("/") ? relative.slice(0, -1) : relative;

      return !trimmed.includes("/");
    })
    .sort((a, b) => {
      if (a.directory !== b.directory) {
        return a.directory ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    });
}

function getEntryName(path) {
  return path.replace(/\/$/, "").split("/").pop();
}

function formatBytes(bytes) {
  if (!bytes) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];

  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }

  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export default ArchiveViewer;
