import React from "react";
import { Box, HStack, VStack, Text, Icon } from "@chakra-ui/react";
import RenameComponent from "./RenameComponent";

// File type → accent color map
const EXT_COLORS = {
  PDF: "#FF6B6B",
  PNG: "#4ECDC4",
  JPG: "#4ECDC4",
  JPEG: "#4ECDC4",
  GIF: "#FFE66D",
  MP4: "#A78BFA",
  MOV: "#A78BFA",
  ZIP: "#FB923C",
  TAR: "#FB923C",
  GZ: "#FB923C",
  JS: "#FFD700",
  TS: "#4FC3F7",
  PY: "#6EE7B7",
  TXT: "#94A3B8",
  MD: "#94A3B8",
  JSON: "#FCA5A5",
  HTML: "#F97316",
  CSS: "#818CF8",
};

const FileItem = function FileItem({
  name,
  size,
  date,
  isSelected,
  onSelect,
  onOpenMenu,
  isRenaming,
  onRename,
  onRenameClose,
}) {
  const ext = name.includes(".") ? name.split(".").pop().toUpperCase() : "FILE";
  const accent = EXT_COLORS[ext] || "#64748B";

  return (
    <Box
      px={4}
      py={3}
      mb="1px"
      bg={isSelected ? "rgba(99, 102, 241, 0.10)" : "transparent"}
      borderLeft="2px solid"
      borderLeftColor={isSelected ? "#6366F1" : "transparent"}
      borderBottom="1px solid rgba(255,255,255,0.05)"
      cursor="pointer"
      transition="all 0.12s ease"
      role="group"
      _hover={{
        bg: isSelected ? "rgba(99,102,241,0.14)" : "rgba(255,255,255,0.04)",
        borderLeftColor: isSelected ? "#6366F1" : "rgba(255,255,255,0.15)",
      }}
      onClick={() => onSelect(name)}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenMenu(e, name);
      }}
    >
      <HStack spacing={3} align="center">
        {/* Colored ext badge */}
        <Box
          w="36px"
          h="36px"
          borderRadius="8px"
          bg="rgba(255,255,255,0.04)"
          border="1px solid rgba(255,255,255,0.08)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
          position="relative"
          overflow="hidden"
          _before={{
            content: '""',
            position: "absolute",
            inset: 0,
            bg: accent,
            opacity: 0.08,
          }}
        >
          <Text
            fontSize="8px"
            fontWeight="800"
            letterSpacing="0.03em"
            color={accent}
            lineHeight={1}
          >
            {ext.slice(0, 4)}
          </Text>
        </Box>

        {/* Name + meta */}
        <VStack align="start" spacing={0} flex={1} minW={0}>
          <Text
            fontSize="sm"
            fontWeight={500}
            color="rgba(255,255,255,0.88)"
            noOfLines={1}
            fontFamily="'JetBrains Mono', 'Fira Code', monospace"
            letterSpacing="-0.01em"
          >
            {name}
          </Text>
          <HStack spacing={2} mt="2px">
            <Text fontSize="11px" color="rgba(255,255,255,0.35)">
              {size} KB
            </Text>
            <Box
              w="2px"
              h="2px"
              borderRadius="full"
              bg="rgba(255,255,255,0.15)"
            />
            <Text fontSize="11px" color="rgba(255,255,255,0.35)">
              {date}
            </Text>
          </HStack>
        </VStack>

        {isSelected && (
          <Box
            w="6px"
            h="6px"
            borderRadius="full"
            bg="#6366F1"
            flexShrink={0}
          />
        )}

        {isRenaming && (
          <Box onClick={(e) => e.stopPropagation()}>
            <RenameComponent
              handleRename={(newname) => onRename(name, newname)}
              onCancel={onRenameClose}
              currentName={name}
            />
          </Box>
        )}
      </HStack>
    </Box>
  );
};

export default FileItem;
