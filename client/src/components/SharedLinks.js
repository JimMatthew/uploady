import {
  Button,
  Box,
  Text,
  Collapse,
  useDisclosure,
  useToast,
  SimpleGrid,
} from "@chakra-ui/react";
import { FiLink, FiTrash } from "react-icons/fi";
import LinkCard from "./LinkCard";
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

  const copyToClip = (text) => {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      // If clipboard API is available, use it
      navigator.clipboard.writeText(text)
        .then(() => {
          toast({
            title: "Link copied!",
            status: "success",
            duration: 2000,
            isClosable: true,
          });
        })
        .catch((err) => {
          console.error("Failed to copy text to clipboard", err);
        });
    } else {
      // Fallback for browsers that don't support Clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast({
          title: "Link copied!",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } catch (err) {
        console.error("Fallback method failed to copy text", err);
      }
      document.body.removeChild(textArea);
    }
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
                  copyToClipboard={copyToClip}
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




export default SharedLinks;
