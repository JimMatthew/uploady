import React from "react";
import { Text, HStack, Box, Icon } from "@chakra-ui/react";
import { FiChevronRight } from "react-icons/fi";

const FolderItem = React.memo(function FolderItem({
  folder,
  changeDirectory,
  onOpenMenu,
}) {
  return (
    <HStack
      px={4}
      py="10px"
      mb="1px"
      justify="space-between"
      align="center"
      cursor="pointer"
      borderLeft="2px solid transparent"
      borderBottom="1px solid rgba(255,255,255,0.04)"
      transition="all 0.12s ease"
      role="group"
      _hover={{
        bg: "rgba(255,255,255,0.03)",
        borderLeftColor: "rgba(251,191,36,0.3)",
      }}
      onClick={() => changeDirectory(folder)}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenMenu(e, folder);
      }}
    >
      <HStack spacing={3}>
        {/* Folder icon tile */}
        <Box
          w="34px"
          h="34px"
          borderRadius="8px"
          bg="rgba(255,255,255,0.03)"
          border="1px solid rgba(251,191,36,0.15)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
          transition="all 0.12s"
          _groupHover={{
            borderColor: "rgba(251,191,36,0.35)",
            bg: "rgba(251,191,36,0.06)",
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 7C3 5.9 3.9 5 5 5H10L12 7H19C20.1 7 21 7.9 21 9V17C21 18.1 20.1 19 19 19H5C3.9 19 3 18.1 3 17V7Z"
              fill="rgba(251,191,36,0.7)"
              stroke="rgba(251,191,36,0.25)"
              strokeWidth="0.5"
            />
          </svg>
        </Box>

        <Text
          fontSize="13px"
          fontWeight={500}
          color="rgba(255,255,255,0.75)"
          fontFamily="'JetBrains Mono', monospace"
          letterSpacing="-0.01em"
          transition="color 0.12s"
          _groupHover={{ color: "rgba(255,255,255,0.95)" }}
        >
          {folder}
        </Text>
      </HStack>

      <Icon
        as={FiChevronRight}
        boxSize="14px"
        color="rgba(255,255,255,0.15)"
        transition="all 0.12s ease"
        _groupHover={{
          color: "rgba(251,191,36,0.5)",
          transform: "translateX(2px)",
        }}
      />
    </HStack>
  );
});

export default FolderItem;
