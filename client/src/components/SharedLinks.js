import {
  Button,
  Box,
  Text,
  SimpleGrid,
  useColorModeValue,
  Spinner,
  Heading,
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
      {/* Button to refresh */}
      <Heading>Active Shared Files</Heading>
      <Box>
        <Button
          leftIcon={<FiLink />}
          colorScheme="blue"
          mb={4}
          onClick={loadLinks}
          m={4}
          size={"md"}
        >
          Refresh
        </Button>
      </Box>

      {loading ? (
        <Box textAlign="center" py={10}>
          <Spinner size="lg" />
          <Text mt={2}>Loading...</Text>
        </Box>
      ) : (
        <Box
          p={{ base: 0, md: 6 }}
          shadow="lg"
          borderWidth="1px"
          borderRadius="lg"
          background="white"
          _hover={{ shadow: "xl" }}
          bg={bgg}
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
              <Text>No shared links available</Text>
            )}
          </SimpleGrid>
        </Box>
      )}
    </Box>
  );
};

export default SharedLinks;
