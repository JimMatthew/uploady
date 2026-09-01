import {
  Box,
  Text,
  Flex,
  SimpleGrid,
  VStack,
  Icon,
  Skeleton,
} from "@chakra-ui/react";
import React, { useEffect } from "react";
import { FiLink, FiRefreshCw, FiShare2 } from "react-icons/fi";
import LinkCard from "./LinkCard";
import { useSharedLinks } from "../hooks/useSharedLinks";

const LoadingSkeleton = () => (
  <SimpleGrid spacing={3} templateColumns="repeat(auto-fill, minmax(280px, 1fr))">
    {[...Array(3)].map((_, i) => (
      <Skeleton
        key={i}
        h="110px"
        borderRadius="10px"
        startColor="rgba(255,255,255,0.04)"
        endColor="rgba(255,255,255,0.08)"
      />
    ))}
  </SimpleGrid>
);

const SharedLinks = () => {
  const {
    links,
    loading,
    loadLinks,
    deleteLink,
    copyToClipboard,
    clickLink,
  } = useSharedLinks();

  useEffect(() => {
    loadLinks();
  }, [loadLinks]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box p={6} >
      {/* Header */}
      <Flex align="center" justify="space-between" mb={6}>
        <Flex align="center" gap={3}>
          <Box
            w="34px"
            h="34px"
            borderRadius="9px"
            bg="rgba(99,102,241,0.12)"
            border="1px solid rgba(99,102,241,0.2)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <FiShare2 color="#818CF8" size={15} />
          </Box>
          <Box>
            <Text
              fontSize="15px"
              fontWeight={700}
              color="rgba(255,255,255,0.88)"
              letterSpacing="-0.02em"
              lineHeight={1.2}
            >
              Shared Links
            </Text>
            <Text fontSize="11px" color="rgba(255,255,255,0.28)" mt="1px">
              {loading ? "Loading…" : `${links.length} active link${links.length !== 1 ? "s" : ""}`}
            </Text>
          </Box>
        </Flex>

        <Flex
          align="center"
          gap={2}
          px={3}
          h="30px"
          borderRadius="7px"
          border="1px solid rgba(255,255,255,0.07)"
          color="rgba(255,255,255,0.3)"
          cursor="pointer"
          fontSize="12px"
          fontWeight={500}
          transition="all 0.15s"
          _hover={{
            borderColor: "rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.7)",
          }}
          onClick={loadLinks}
        >
          <Icon
            as={FiRefreshCw}
            boxSize="11px"
            style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
          />
          Refresh
        </Flex>
      </Flex>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : links.length > 0 ? (
        <SimpleGrid
          spacing={3}
          templateColumns="repeat(auto-fill, minmax(280px, 1fr))"
        >
          {links.map((link, i) => (
            <LinkCard
              key={link._id}
              linkItem={link}
              stopSharing={deleteLink}
              clickLink={clickLink}
              copyToClipboard={copyToClipboard}
            />
          ))}
        </SimpleGrid>
      ) : (
        <Flex
          direction="column"
          align="center"
          justify="center"
          py={16}
          gap={3}
          border="1px dashed rgba(255,255,255,0.06)"
          borderRadius="12px"
          bg="rgba(255,255,255,0.01)"
        >
          <Box
            w="44px"
            h="44px"
            borderRadius="11px"
            bg="rgba(99,102,241,0.08)"
            border="1px solid rgba(99,102,241,0.15)"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <FiShare2 color="rgba(99,102,241,0.5)" size={18} />
          </Box>
          <VStack spacing={1}>
            <Text fontSize="13px" fontWeight={600} color="rgba(255,255,255,0.3)">
              No shared links
            </Text>
            <Text fontSize="11px" color="rgba(255,255,255,0.15)" textAlign="center" maxW="200px">
              Right-click any file and select Share Link to get started
            </Text>
          </VStack>
        </Flex>
      )}
    </Box>
  );
};

export default SharedLinks;