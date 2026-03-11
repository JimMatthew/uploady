import React from "react";
import { Box, Flex, Text, Icon, Center } from "@chakra-ui/react";
import { FiX, FiLayout } from "react-icons/fi";

const TabPanelComp = ({
  tabs,
  activeTabIndex,
  setActiveTabIndex,
  closeTab,
}) => {
  return (
    <Box h="100%" display="flex" flexDirection="column">
      {/* Tab bar */}
      <Flex
        align="stretch"
        borderBottom="1px solid rgba(255,255,255,0.07)"
        overflowX="auto"
        flexShrink={0}
        sx={{
          "::-webkit-scrollbar": { height: "2px" },
          "::-webkit-scrollbar-thumb": {
            background: "rgba(255,255,255,0.08)",
            borderRadius: "1px",
          },
        }}
      >
        {tabs.length > 0 ? (
          tabs.map((tab, i) => {
            const isActive = i === activeTabIndex;
            return (
              <Flex
                key={tab.id}
                align="center"
                gap={2}
                px={3}
                h="38px"
                minW="fit-content"
                maxW="180px"
                cursor="pointer"
                borderRight="1px solid rgba(255,255,255,0.05)"
                borderBottom="2px solid"
                borderBottomColor={isActive ? "#6366F1" : "transparent"}
                bg={isActive ? "rgba(99,102,241,0.08)" : "transparent"}
                transition="all 0.12s"
                _hover={{
                  bg: isActive
                    ? "rgba(99,102,241,0.1)"
                    : "rgba(255,255,255,0.03)",
                }}
                onClick={() => setActiveTabIndex(i)}
                role="group"
              >
                <Text
                  fontSize="12px"
                  fontWeight={isActive ? 600 : 450}
                  color={
                    isActive
                      ? "rgba(255,255,255,0.88)"
                      : "rgba(255,255,255,0.38)"
                  }
                  fontFamily="'JetBrains Mono', monospace"
                  noOfLines={1}
                  letterSpacing="-0.01em"
                  flex={1}
                  minW={0}
                  transition="color 0.12s"
                  _groupHover={{
                    color: isActive
                      ? "rgba(255,255,255,0.88)"
                      : "rgba(255,255,255,0.65)",
                  }}
                >
                  {tab.label}
                </Text>
                <Flex
                  w="16px"
                  h="16px"
                  flexShrink={0}
                  align="center"
                  justify="center"
                  borderRadius="4px"
                  color="rgba(255,255,255,0.25)"
                  opacity={isActive ? 1 : 0}
                  transition="all 0.12s"
                  _groupHover={{ opacity: 1 }}
                  _hover={{ bg: "rgba(239,68,68,0.2)", color: "#EF4444" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <FiX size={10} />
                </Flex>
              </Flex>
            );
          })
        ) : (
          <Flex align="center" px={4} h="38px">
            <Text
              fontSize="12px"
              color="rgba(255,255,255,0.2)"
              fontStyle="italic"
              fontFamily="'JetBrains Mono', monospace"
            >
              No open tabs
            </Text>
          </Flex>
        )}
      </Flex>

      {/* Panel content */}
      <Box flex={1} overflow="hidden">
        {tabs.length > 0 ? (
          tabs.map((tab, i) => (
            <Box
              key={tab.id}
              display={i === activeTabIndex ? "flex" : "none"}
              flexDirection="column"
              h="100%"
            >
              {tab.content}
            </Box>
          ))
        ) : (
          <Center h="100%" flexDirection="column" gap={3}>
            <Box
              w="48px"
              h="48px"
              borderRadius="12px"
              bg="rgba(99,102,241,0.08)"
              border="1px dashed rgba(99,102,241,0.2)"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={FiLayout} boxSize="20px" color="rgba(99,102,241,0.4)" />
            </Box>
            <Flex direction="column" align="center" gap={1}>
              <Text
                fontSize="13px"
                fontWeight={500}
                color="rgba(255,255,255,0.3)"
                letterSpacing="-0.01em"
              >
                No tabs open
              </Text>
              <Text fontSize="11px" color="rgba(255,255,255,0.15)">
                Connect to a server or open local files
              </Text>
            </Flex>
          </Center>
        )}
      </Box>
    </Box>
  );
};

export default TabPanelComp;
