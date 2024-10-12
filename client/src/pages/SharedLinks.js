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
          margin={"5px"}
        >
          Show Shared Links
        </Button>
      </Box>

      {/* Card that slides down when the shared links are shown */}
      <Collapse in={isOpen}>
        <Box
          p={5}
          shadow="lg"
          borderWidth="1px"
          borderRadius="md"
          background="white"
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

const LinkCard = ({ linkItem, stopSharing, clickLink }) => {
  const { fileName, filePath, link, token } = linkItem;

  return (
    <Card shadow="md" borderWidth="1px" borderRadius="lg" p={4}>
      <CardHeader fontWeight="bold" fontSize="lg" mb={2}>
        {fileName}
      </CardHeader>

      <CardBody>
        <Stack spacing={3}>
          <Text fontSize="sm" color="gray.600">
            Path: {filePath}
          </Text>

          {/* Clickable Link */}
          <Text
            color="blue.500"
            cursor="pointer"
            onClick={() => clickLink(link, fileName)}
            textDecoration="underline"
          >
            {link}
          </Text>

          <Box>
            {/* Button to stop sharing */}
            <IconButton
              aria-label="Stop Sharing"
              icon={<FiTrash />}
              size="sm"
              colorScheme="red"
              onClick={() => stopSharing(token)}
              mt={2}
            />
          </Box>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default SharedLinks;
