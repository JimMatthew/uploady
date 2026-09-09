import React from "react";
import {
  Box,
  Center,
  Flex,
  Icon,
  Text,
} from "@chakra-ui/react";
import { FiLayout, FiX } from "react-icons/fi";

const TabPanelComp = ({
  tabs,
  activeTabIndex,
  setActiveTabIndex,
  closeTab,
}) => {
  return (
    <Box
      h="100%"
      display="flex"
      flexDirection="column"
      minH={0}
    >
      {/* Tab bar */}
      <Flex
        align="stretch"
        flexShrink={0}
        minH="40px"
        overflowX="auto"
        overflowY="hidden"
        bg="rgba(255,255,255,0.012)"
        borderBottom="1px solid"
        borderColor="rgba(255,255,255,0.07)"
        sx={{
          scrollbarWidth: "auto",
          scrollbarColor:
            "rgba(255,255,255,0.16) rgba(255,255,255,0.025)",

          "::-webkit-scrollbar": {
            height: "6px",
          },

          "::-webkit-scrollbar-track": {
            background: "rgba(255,255,255,0.02)",
          },

          "::-webkit-scrollbar-thumb": {
            background: "rgba(255,255,255,0.14)",
            borderRadius: "4px",
            border: "2px solid transparent",
            backgroundClip: "padding-box",
          },

          "::-webkit-scrollbar-thumb:hover": {
            background: "rgba(255,255,255,0.25)",
            border: "2px solid transparent",
            backgroundClip: "padding-box",
          },
        }}
      >
        {tabs.length > 0 ? (
          tabs.map((tab, i) => {
            const isActive = i === activeTabIndex;

            return (
              <Flex
                key={tab.id}
                role="group"
                align="center"
                gap={2}
                h="40px"
                minW="110px"
                maxW="200px"
                px={3}
                flexShrink={0}
                cursor="pointer"
                position="relative"
                bg={
                  isActive
                    ? "rgba(255,255,255,0.04)"
                    : "transparent"
                }
                borderRight="1px solid"
                borderRightColor="rgba(255,255,255,0.045)"
                transition="
                  background 120ms ease,
                  color 120ms ease
                "
                onClick={() => setActiveTabIndex(i)}
                _hover={{
                  bg: isActive
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(255,255,255,0.025)",
                }}
              >
                {/* Active indicator */}
                {isActive && (
                  <Box
                    position="absolute"
                    left={0}
                    right={0}
                    bottom={0}
                    h="2px"
                    bg="#818CF8"
                  />
                )}

                <Text
                  flex={1}
                  minW={0}
                  noOfLines={1}
                  fontSize="12px"
                  fontWeight={isActive ? 600 : 500}
                  fontFamily="'JetBrains Mono', monospace"
                  letterSpacing="-0.01em"
                  color={
                    isActive
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(255,255,255,0.42)"
                  }
                  transition="color 120ms ease"
                  _groupHover={{
                    color: isActive
                      ? "rgba(255,255,255,0.95)"
                      : "rgba(255,255,255,0.68)",
                  }}
                >
                  {tab.label}
                </Text>

                <Flex
                  align="center"
                  justify="center"
                  w="20px"
                  h="20px"
                  flexShrink={0}
                  borderRadius="5px"
                  color="rgba(255,255,255,0.28)"
                  opacity={isActive ? 0.75 : 0}
                  transition="
                    opacity 120ms ease,
                    background 120ms ease,
                    color 120ms ease
                  "
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  _groupHover={{
                    opacity: 1,
                  }}
                  _hover={{
                    bg: "rgba(229,115,115,0.1)",
                    color: "#E57373",
                  }}
                >
                  <FiX size={11} />
                </Flex>
              </Flex>
            );
          })
        ) : (
          <Flex
            align="center"
            px={4}
            h="40px"
          >
            <Text
              fontSize="11px"
              fontWeight={500}
              color="rgba(255,255,255,0.24)"
              fontFamily="'JetBrains Mono', monospace"
            >
              No open tabs
            </Text>
          </Flex>
        )}
      </Flex>

      {/* Panel content */}
      <Box
        flex={1}
        minH={0}
        overflow="hidden"
      >
        {tabs.length > 0 ? (
          tabs.map((tab, i) => (
            <Box
              key={tab.id}
              display={
                i === activeTabIndex
                  ? "flex"
                  : "none"
              }
              flexDirection="column"
              h="100%"
              w="100%"
              minH={0}
              overflow="auto"
            >
              {tab.content}
            </Box>
          ))
        ) : (
          <Center
            h="100%"
            flexDirection="column"
            gap={3}
            px={6}
          >
            <Flex
              align="center"
              justify="center"
              w="46px"
              h="46px"
              borderRadius="11px"
              bg="rgba(255,255,255,0.025)"
              border="1px solid"
              borderColor="rgba(255,255,255,0.07)"
            >
              <Icon
                as={FiLayout}
                boxSize="18px"
                color="rgba(129,140,248,0.55)"
              />
            </Flex>

            <Flex
              direction="column"
              align="center"
              gap="3px"
            >
              <Text
                fontSize="13px"
                fontWeight={500}
                color="rgba(255,255,255,0.4)"
                letterSpacing="-0.01em"
              >
                No tabs open
              </Text>

              <Text
                fontSize="11px"
                textAlign="center"
                color="rgba(255,255,255,0.2)"
              >
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