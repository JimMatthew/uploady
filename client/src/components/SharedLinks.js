import {
  Button,
  Box,
  Text,
  Collapse,
  SimpleGrid,
  useColorModeValue,
} from "@chakra-ui/react";
import { FiLink, FiTrash } from "react-icons/fi";
import LinkCard from "./LinkCard";
import { useSharedLinks } from "../hooks/useSharedLinks";
const SharedLinks = ({ onReload, links }) => {
  const bgg = useColorModeValue("white", "gray.700");
  const {
    clickLink,
    handleShowLinks,
    deleteLink,
    copyToClip,
    isOpen,
  } = useSharedLinks({ onReload });
  return (
    <Box>
      {/* Button to show/hide shared links */}
      <Box align="center">
        <Button
          leftIcon={<FiLink />}
          colorScheme="blue"
          mb={4}
          onClick={handleShowLinks}
          margin="5px"
        >
          Show Shared Links
        </Button>
      </Box>

      <Collapse in={isOpen}>
        <Box
          p={{ base: 0, md: 6 }}
          shadow="lg"
          borderWidth="1px"
          borderRadius="lg"
          background="white"
          transition="0.3s ease"
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
      </Collapse>
    </Box>
  );
};

export default SharedLinks;
