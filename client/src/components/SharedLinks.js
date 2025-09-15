import {
  Button,
  Box,
  Text,
  SimpleGrid,
  useColorModeValue,
  Spinner,
  Heading,
  HStack,
  VStack
} from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import { FiLink, FiTrash } from "react-icons/fi";
import LinkCard from "./LinkCard";
import { useSharedLinks } from "../hooks/useSharedLinks";

const SharedLinks = () => {
  const bgg = useColorModeValue("white", "gray.700");
  const { clickLink, deleteLink, copyToClip, links, loading, loadLinks } =
    useSharedLinks();

  useEffect(() => {
    loadLinks();
  }, []);

  return (
    <Box>
      <HStack justify="space-between" align="center" mb={4}>
        <Heading size="lg">Active Shared Files</Heading>
        <Button
          leftIcon={<FiLink />}
          colorScheme="blue"
          onClick={loadLinks}
          size="sm"
        >
          Refresh
        </Button>
      </HStack>

      {loading ? (
        <VStack py={10} spacing={3}>
          <Spinner size="lg" />
          <Text fontSize="md" color="gray.500">
            Loading shared links...
          </Text>
        </VStack>
      ) : (
        <Box
          p={{ base: 4, md: 6 }}
          shadow="lg"
          borderWidth="1px"
          borderRadius="lg"
          bg={bgg}
          transition="all 0.2s"
          _hover={{ shadow: "xl" }}
        >
          <SimpleGrid
            spacing={6}
            templateColumns="repeat(auto-fill, minmax(300px, 1fr))"
          >
            {links.length > 0 ? (
              links.map((link, index) => (
                <LinkCard
                  key={index}
                  linkItem={link}
                  stopSharing={deleteLink}
                  clickLink={clickLink}
                  copyToClipboard={copyToClip}
                />
              ))
            ) : (
              <Box textAlign="center" py={6}>
                <Text fontSize="md" color="gray.500">
                  No shared links available
                </Text>
              </Box>
            )}
          </SimpleGrid>
        </Box>
      )}
    </Box>
  );
};

export default SharedLinks;
