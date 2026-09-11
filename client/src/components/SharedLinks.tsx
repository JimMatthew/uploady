import { useEffect } from "react";

import {
  Box,
  Button,
  Flex,
  Icon,
  SimpleGrid,
  Skeleton,
  Text,
} from "@chakra-ui/react";

import { FiRefreshCw, FiShare2 } from "react-icons/fi";

import LinkCard from "./LinkCard";
import { useSharedLinks } from "../hooks/useSharedLinks";

const LoadingSkeleton = () => (
  <SimpleGrid
    spacing={3}
    templateColumns="repeat(auto-fill, minmax(320px, 1fr))"
  >
    {[...Array(3)].map((_, index) => (
      <Skeleton
        key={index}
        h="160px"
        borderRadius="10px"
        startColor="rgba(255,255,255,0.025)"
        endColor="rgba(255,255,255,0.06)"
      />
    ))}
  </SimpleGrid>
);

const SharedLinks = () => {
  const { links, loading, loadLinks, deleteLink, copyToClipboard, clickLink } =
    useSharedLinks();

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  const linkCountText = loading
    ? "Loading shared links…"
    : `${links.length} active link${links.length === 1 ? "" : "s"}`;

  return (
    <Box
      h="100%"
      overflowY="auto"
      px={{
        base: 4,
        md: 6,
      }}
      py={{
        base: 5,
        md: 6,
      }}
    >
      <Box maxW="1200px" mx="auto">
        {/* Header */}

        <Flex
          align={{
            base: "flex-start",
            sm: "center",
          }}
          justify="space-between"
          direction={{
            base: "column",
            sm: "row",
          }}
          gap={4}
          mb={6}
        >
          <Flex align="center" gap={3}>
            <Flex
              w="32px"
              h="32px"
              align="center"
              justify="center"
              borderRadius="7px"
              bg="rgba(99,102,241,0.1)"
              color="#818CF8"
              flexShrink={0}
            >
              <Icon as={FiShare2} boxSize="14px" />
            </Flex>

            <Box>
              <Text
                fontSize="15px"
                fontWeight={600}
                color="whiteAlpha.900"
                letterSpacing="-0.02em"
                lineHeight={1.2}
              >
                Shared Links
              </Text>

              <Text mt="2px" fontSize="11px" color="whiteAlpha.400">
                {linkCountText}
              </Text>
            </Box>
          </Flex>

          <Button
            size="sm"
            h="30px"
            px={3}
            leftIcon={
              <Icon
                as={FiRefreshCw}
                boxSize="11px"
                animation={loading ? "spin 1s linear infinite" : "none"}
              />
            }
            onClick={() => {
              void loadLinks();
            }}
            isDisabled={loading}
            variant="ghost"
            border="1px solid"
            borderColor="whiteAlpha.100"
            color="whiteAlpha.500"
            fontSize="11px"
            fontWeight={500}
            _hover={{
              borderColor: "whiteAlpha.200",
              bg: "whiteAlpha.50",
              color: "whiteAlpha.800",
            }}
          >
            Refresh
          </Button>
        </Flex>

        {/* Content */}

        {loading ? (
          <LoadingSkeleton />
        ) : links.length > 0 ? (
          <SimpleGrid
            spacing={3}
            columns={{
              base: 1,
              xl: 2,
            }}
          >
            {links.map((link) => (
              <LinkCard
                key={link._id}
                linkItem={link}
                stopSharing={deleteLink}
                downloadLink={clickLink}
                copyToClipboard={copyToClipboard}
              />
            ))}
          </SimpleGrid>
        ) : (
          <EmptyState />
        )}
      </Box>
    </Box>
  );
};

const EmptyState = () => (
  <Flex
    direction="column"
    align="center"
    justify="center"
    py={16}
    border="1px dashed"
    borderColor="whiteAlpha.100"
    borderRadius="10px"
    bg="rgba(255,255,255,0.01)"
  >
    <Flex
      w="42px"
      h="42px"
      mb={3}
      align="center"
      justify="center"
      borderRadius="9px"
      bg="rgba(99,102,241,0.07)"
      color="rgba(129,140,248,0.6)"
    >
      <Icon as={FiShare2} boxSize="17px" />
    </Flex>

    <Text fontSize="13px" fontWeight={500} color="whiteAlpha.500">
      No shared links
    </Text>

    <Text
      mt={1}
      fontSize="11px"
      color="whiteAlpha.300"
      textAlign="center"
      maxW="240px"
    >
      Right-click a file and select Share Link to create one.
    </Text>
  </Flex>
);

export default SharedLinks;
