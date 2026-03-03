import {
  Box,
  Text,
  Flex,
  SimpleGrid,
  VStack,
  Icon,
  Spinner,
} from "@chakra-ui/react";
import React, { useEffect } from "react";
import { FiLink, FiRefreshCw } from "react-icons/fi";
import LinkCard from "./LinkCard";
import { useSharedLinks } from "../hooks/useSharedLinks";

const SharedLinks = () => {
  const { clickLink, deleteLink, copyToClip, links, loading, loadLinks } =
    useSharedLinks();
  useEffect(() => {
    loadLinks();
  }, []);

  return (
    <Box p={6}>
      {/* Header row */}
      <Flex align="center" justify="space-between" mb={5}>
        <Flex align="center" gap={3}>
          <Box
            w="32px"
            h="32px"
            borderRadius="8px"
            bg="rgba(99,102,241,0.12)"
            border="1px solid rgba(99,102,241,0.2)"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <FiLink color="#6366F1" size={14} />
          </Box>
          <Box>
            <Text
              fontSize="15px"
              fontWeight={700}
              color="rgba(255,255,255,0.9)"
              letterSpacing="-0.02em"
            >
              Shared Files
            </Text>
            <Text fontSize="12px" color="rgba(255,255,255,0.3)">
              {links.length} active link{links.length !== 1 ? "s" : ""}
            </Text>
          </Box>
        </Flex>

        <Flex
          align="center"
          gap={2}
          px={3}
          h="32px"
          borderRadius="7px"
          border="1px solid rgba(255,255,255,0.08)"
          color="rgba(255,255,255,0.35)"
          cursor="pointer"
          fontSize="12px"
          fontWeight={500}
          transition="all 0.12s"
          _hover={{
            borderColor: "rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.75)",
          }}
          onClick={loadLinks}
        >
          <Icon as={FiRefreshCw} boxSize="12px" />
          Refresh
        </Flex>
      </Flex>

      {loading ? (
        <VStack py={12} spacing={3}>
          <Spinner size="sm" color="rgba(99,102,241,0.6)" />
          <Text fontSize="12px" color="rgba(255,255,255,0.25)">
            Loading…
          </Text>
        </VStack>
      ) : links.length > 0 ? (
        <SimpleGrid
          spacing={3}
          templateColumns="repeat(auto-fill, minmax(280px, 1fr))"
        >
          {links.map((link, i) => (
            <LinkCard
              key={i}
              linkItem={link}
              stopSharing={deleteLink}
              clickLink={clickLink}
              copyToClipboard={copyToClip}
            />
          ))}
        </SimpleGrid>
      ) : (
        <Flex
          direction="column"
          align="center"
          justify="center"
          h="160px"
          border="1px dashed rgba(255,255,255,0.07)"
          borderRadius="12px"
          gap={2}
        >
          <Icon as={FiLink} boxSize="20px" color="rgba(255,255,255,0.12)" />
          <Text fontSize="13px" color="rgba(255,255,255,0.2)">
            No shared links yet
          </Text>
        </Flex>
      )}
    </Box>
  );
};

export default SharedLinks;
