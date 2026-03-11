import React from "react";
import { Box, HStack, VStack, Text, Icon } from "@chakra-ui/react";
import { FiCheck } from "react-icons/fi";
import RenameComponent from "./RenameComponent";

// ─── File type → accent color ─────────────────────────────────────────────────

const EXT_COLORS = {
  PDF: "#FF6B6B",
  PNG: "#4ECDC4",
  JPG: "#4ECDC4",
  JPEG: "#4ECDC4",
  WEBP: "#4ECDC4",
  GIF: "#FFE66D",
  SVG: "#FFE66D",
  MP4: "#A78BFA",
  MOV: "#A78BFA",
  MKV: "#A78BFA",
  MP3: "#F472B6",
  WAV: "#F472B6",
  ZIP: "#FB923C",
  TAR: "#FB923C",
  GZ: "#FB923C",
  RAR: "#FB923C",
  JS: "#FFD700",
  JSX: "#FFD700",
  TS: "#4FC3F7",
  TSX: "#4FC3F7",
  PY: "#6EE7B7",
  RS: "#FB923C",
  GO: "#4FC3F7",
  SH: "#6EE7B7",
  TXT: "#94A3B8",
  MD: "#94A3B8",
  JSON: "#FCA5A5",
  YAML: "#FCA5A5",
  YML: "#FCA5A5",
  TOML: "#FCA5A5",
  HTML: "#F97316",
  CSS: "#818CF8",
  SCSS: "#818CF8",
  ENV: "#6EE7B7",
  CONF: "#94A3B8",
  INI: "#94A3B8",
  LOG: "#64748B",
  SQL: "#FCA5A5",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatSize = (kb) => {
  if (kb === undefined || kb === null) return "—";
  const n = parseFloat(kb);
  if (isNaN(n)) return "—";
  if (n < 1) return `${(n * 1024).toFixed(0)} B`;
  if (n < 1024) return `${n.toFixed(1)} KB`;
  return `${(n / 1024).toFixed(1)} MB`;
};

const formatDate = (raw) => {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return raw;
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

const FileItem = ({
  name,
  size,
  date,
  isSelected,
  onSelect,
  onOpenMenu,
  isRenaming,
  onRename,
  onRenameClose,
}) => {
  const ext = name.includes(".") ? name.split(".").pop().toUpperCase() : "FILE";
  const accent = EXT_COLORS[ext] || "#64748B";

  return (
    <Box
      px={4}
      py="10px"
      mb="1px"
      bg={isSelected ? "rgba(99,102,241,0.10)" : "transparent"}
      borderLeft="2px solid"
      borderLeftColor={isSelected ? "#6366F1" : "transparent"}
      borderBottom="1px solid rgba(255,255,255,0.04)"
      cursor="pointer"
      transition="all 0.12s ease"
      role="group"
      _hover={{
        bg: isSelected ? "rgba(99,102,241,0.14)" : "rgba(255,255,255,0.03)",
        borderLeftColor: isSelected ? "#6366F1" : "rgba(255,255,255,0.12)",
      }}
      onClick={() => onSelect(name)}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenMenu(e, name);
      }}
    >
      <HStack spacing={3} align="center">
        {/* Ext badge */}
        <Box
          w="34px"
          h="34px"
          borderRadius="8px"
          bg="rgba(255,255,255,0.03)"
          border="1px solid"
          borderColor={`${accent}22`}
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
          position="relative"
          overflow="hidden"
          transition="all 0.12s"
          _groupHover={{
            borderColor: `${accent}44`,
            bg: `${accent}10`,
          }}
          _before={{
            content: '""',
            position: "absolute",
            inset: 0,
            bg: accent,
            opacity: 0.06,
          }}
        >
          <Text
            fontSize="8px"
            fontWeight="800"
            letterSpacing="0.03em"
            color={accent}
            lineHeight={1}
            zIndex={1}
          >
            {ext.slice(0, 4)}
          </Text>
        </Box>

        {/* Name + rename + meta */}
        <VStack align="start" spacing={0} flex={1} minW={0}>
          {isRenaming ? (
            <Box onClick={(e) => e.stopPropagation()} w="fit-content">
              <RenameComponent
                handleRename={(newname) => onRename(name, newname)}
                onCancel={onRenameClose}
                currentName={name}
              />
            </Box>
          ) : (
            <Text
              fontSize="13px"
              fontWeight={500}
              color="rgba(255,255,255,0.85)"
              noOfLines={1}
              fontFamily="'JetBrains Mono', monospace"
              letterSpacing="-0.01em"
              transition="color 0.12s"
              _groupHover={{ color: "rgba(255,255,255,0.95)" }}
            >
              {name}
            </Text>
          )}
          {!isRenaming && (
            <HStack spacing={2} mt="2px">
              <Text
                fontSize="11px"
                color="rgba(255,255,255,0.3)"
                fontFamily="'JetBrains Mono', monospace"
              >
                {formatSize(size)}
              </Text>
              <Box
                w="2px"
                h="2px"
                borderRadius="full"
                bg="rgba(255,255,255,0.12)"
              />
              <Text
                fontSize="11px"
                color="rgba(255,255,255,0.3)"
                fontFamily="'JetBrains Mono', monospace"
              >
                {formatDate(date)}
              </Text>
            </HStack>
          )}
        </VStack>

        {/* Selected indicator */}
        {isSelected && !isRenaming && (
          <Box
            w="18px"
            h="18px"
            borderRadius="5px"
            bg="rgba(99,102,241,0.25)"
            border="1px solid rgba(99,102,241,0.4)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <Icon as={FiCheck} boxSize="10px" color="#818CF8" />
          </Box>
        )}
      </HStack>
    </Box>
  );
};

export default FileItem;