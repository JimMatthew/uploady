import React, { useCallback, useEffect, useState } from "react";

import { Box, Flex, Text, Spinner, Icon } from "@chakra-ui/react";

import { FiArchive, FiFolder, FiFile, FiArrowLeft } from "react-icons/fi";

import apiClient from "../services/apiClient";

const ArchiveViewer = ({ archivePath, filename, toast, openFile }) => {
  const [entries, setEntries] = useState([]);
  const [currentDirectory, setCurrentDirectory] = useState("");
  const [loading, setLoading] = useState(true);

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
  };

  return (
    <Box h="100%" display="flex" flexDirection="column" bg="gray.800">
      <ArchiveHeader
        filename={filename}
        currentDirectory={currentDirectory}
        canGoBack={currentDirectory !== ""}
        onBack={goBack}
      />

      <Box flex={1} overflowY="auto">
        {loading ? (
          <Flex align="center" justify="center" h="100%" gap={3}>
            <Spinner size="sm" />

            <Text fontSize="12px" color="rgba(255,255,255,0.35)">
              Opening archive...
            </Text>
          </Flex>
        ) : (
          <ArchiveContents entries={visibleEntries} onOpen={openEntry} />
        )}
      </Box>
    </Box>
  );
};

const ArchiveHeader = ({ filename, currentDirectory, canGoBack, onBack }) => {
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

const ArchiveContents = ({ entries, onOpen }) => {
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
    <Flex direction="column" px={3} py={3} gap={1}>
      {entries.map((entry) => (
        <ArchiveEntry
          key={entry.name}
          entry={entry}
          onOpen={() => onOpen(entry)}
        />
      ))}
    </Flex>
  );
};

const ArchiveEntry = ({ entry, onOpen }) => {
  const name = getEntryName(entry.name);

  return (
    <Flex
      align="center"
      gap={3}
      px={3}
      py={2}
      borderRadius="6px"
      cursor="pointer"
      _hover={{
        bg: "rgba(255,255,255,0.04)",
      }}
      onDoubleClick={onOpen}
    >
      <Icon
        as={entry.directory ? FiFolder : FiFile}
        boxSize="15px"
        color={entry.directory ? "#A5B4FC" : "rgba(255,255,255,0.4)"}
        flexShrink={0}
      />

      <Text
        flex={1}
        minW={0}
        fontSize="12px"
        color="rgba(255,255,255,0.7)"
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
      >
        {name}
      </Text>

      {!entry.directory && (
        <Text fontSize="10px" color="rgba(255,255,255,0.25)" flexShrink={0}>
          {formatBytes(entry.size)}
        </Text>
      )}
    </Flex>
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
