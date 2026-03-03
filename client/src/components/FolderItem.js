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
      borderBottom="1px solid rgba(255,255,255,0.05)"
      transition="all 0.12s ease"
      role="group"
      _hover={{
        bg: "rgba(255,255,255,0.04)",
        borderLeftColor: "rgba(255,255,255,0.15)",
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
          w="36px"
          h="36px"
          borderRadius="8px"
          bg="rgba(255,255,255,0.04)"
          border="1px solid rgba(255,255,255,0.08)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
          transition="border-color 0.12s"
          _groupHover={{ borderColor: "rgba(251,191,36,0.25)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 7C3 5.9 3.9 5 5 5H10L12 7H19C20.1 7 21 7.9 21 9V17C21 18.1 20.1 19 19 19H5C3.9 19 3 18.1 3 17V7Z"
              fill="rgba(251, 190, 36, 0.75)"
              stroke="rgba(251,191,36,0.3)"
              strokeWidth="0.5"
            />
          </svg>
        </Box>

        <Text
          fontSize="sm"
          fontWeight={500}
          color="rgba(200,210,240,0.75)"
          fontFamily="'JetBrains Mono', 'Fira Code', monospace"
          letterSpacing="-0.01em"
          transition="color 0.12s"
          _groupHover={{ color: "rgba(255,255,255,0.95)" }}
        >
          {folder}
        </Text>
      </HStack>

      <Icon
        as={FiChevronRight}
        boxSize={4}
        color="rgba(255,255,255,0.2)"
        transition="all 0.12s ease"
        _groupHover={{
          color: "rgba(255,255,255,0.45)",
          transform: "translateX(2px)",
        }}
      />
    </HStack>
  );
});

export default FolderItem;
