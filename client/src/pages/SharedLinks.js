import {
  Button,
  Box,
  Text,
  Collapse,
  useDisclosure,
  Card,
  useToast,
  CardHeader,
  CardBody,
  Stack,
  SimpleGrid,
  IconButton,
  Flex,
  Heading,
} from "@chakra-ui/react";
import { FiLink, FiTrash } from "react-icons/fi";

const SharedLinks = ({ onReload, links }) => {
  const { isOpen, onToggle } = useDisclosure();
  const token = localStorage.getItem("token");
  const toast = useToast();
  const handleShowLinks = () => {
    if (isOpen) {
      onToggle();
      return;
    }
    onToggle();
    onReload();
  };

  const deleteLink = (linkToken) => {
    fetch(`/api/stop-sharing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ token: linkToken }),
    })
      .then((res) => res.json())
      .then(onReload())
      .catch((err) => {
        toast({
          title: "Error",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Link copied!",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };

  const clickLink = (link, fileName) => {
    fetch(link, {
      headers: {},
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((error) => console.error("Download error:", error));
  };

  return (
    <>
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
          p={6}
          shadow="lg"
          borderWidth="1px"
          borderRadius="lg"
          background="white"
          transition="0.3s ease"
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
                  copyToClipboard={() => copyToClipboard(link.link)}
                />
              ))
            ) : (
              <Text>No shared links available</Text>
            )}
          </SimpleGrid>
        </Box>
      </Collapse>
    </>
  );
};


const LinkCard = ({ linkItem, stopSharing, clickLink, copyToClipboard }) => {
  return (
    <Box
      p={4}
      shadow="md"
      borderWidth="1px"
      borderRadius="lg"
      background="gray.50"
      transition="0.3s ease"
      _hover={{ shadow: "lg", background: "gray.100" }}
    >
      <Flex justify="space-between" align="center" mb={3}>
        <Heading size="sm" isTruncated maxW="200px">
          {linkItem.fileName}
        </Heading>
        <Button
          size="xs"
          colorScheme="red"
          onClick={() => stopSharing(linkItem.token)}
        >
          Stop Sharing
        </Button>
      </Flex>

      <Text fontSize="sm" color="gray.600" mb={2} noOfLines={2}>
        {linkItem.link}
      </Text>

      <Flex justify="space-between" align="center">
        <Button
          size="sm"
          colorScheme="blue"
          variant="outline"
          onClick={() => clickLink(linkItem.link, linkItem.fileName)}
        >
          Download
        </Button>
        <Button size="sm" colorScheme="green" onClick={copyToClipboard}>
          Copy Link
        </Button>
      </Flex>
    </Box>
  );
};

export default SharedLinks;
