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
} from "@chakra-ui/react";
import { useState } from "react";
import { Link } from "react-router-dom";

const SharedLinks = () => {
  const { isOpen, onToggle } = useDisclosure();
  const [links, setLinks] = useState([]);
  const token = localStorage.getItem("token");
  const toast = useToast();
  const handleShowLinks = () => {
    if (isOpen) {
      onToggle();
      return;
    }
    onToggle();
    fetchLinks();
  };

  const fetchLinks = () => {
    fetch("/api/links", {
      headers: {
        Authorization: `Bearer ${token}`, // Add your token
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setLinks(data.links);
        //onToggle() // Toggle the card to show links
      })
      .catch((err) => {
        console.error("Error fetching shared links", err);
      });
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
      .then(fetchLinks())
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
      headers: {
        //Authorization: `Bearer ${token}`, // Add your token
      },
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
  }

  return (
    <>
      <Button onClick={handleShowLinks} mb={4}>
        Show Shared Links
      </Button>

      {/* Card that slides down */}
      <Collapse in={isOpen}>
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
          <SimpleGrid
            spacing={4}
            templateColumns="repeat(auto-fill, minmax(400px, 1fr))"
          >
            {links.length > 0 ? (
              links.map((link, index) => (
                <Box key={index} mb={2}>
                  <Linkbox linkItem={link} stopSharing={deleteLink} clickLink={clickLink}/>
                </Box>
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

const Linkbox = ({ linkItem, stopSharing, clickLink }) => {
  const { fileName, filePath, link, token } = linkItem;
  return (
    <Card>
      <CardHeader fontWeight="bold">{fileName}</CardHeader>
      <Stack>
        <CardBody>
        <Text >Path: {filePath}</Text>
          <Text color="gray.500">Link: {link}</Text>
          
          <Button size="sm" onClick={() => stopSharing(token)}>
            Stop Sharing
          </Button>
        </CardBody>
      </Stack>
    </Card>
  );
};

export default SharedLinks;
