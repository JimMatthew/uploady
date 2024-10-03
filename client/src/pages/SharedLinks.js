import {
  Button,
  Box,
  Text,
  Collapse,
  useDisclosure,
  Card,
} from "@chakra-ui/react";
import { useState } from "react";

const SharedLinks = () => {
  const { isOpen, onToggle } = useDisclosure();
  const [links, setLinks] = useState([]);
  const token = localStorage.getItem("token");
  const handleShowLinks = () => {
    if (isOpen) {
      onToggle();
      return;
    }
    onToggle();
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

  return (
    <>
      <Button onClick={handleShowLinks} mb={4}>
        Show Shared Links
      </Button>

      {/* Card that slides down */}
      <Collapse in={isOpen}>
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
          {links.length > 0 ? (
            links.map((link, index) => (
              <Box key={index} mb={2}>
                <Linkbox linkItem={link} />
              </Box>
            ))
          ) : (
            <Text>No shared links available</Text>
          )}
        </Box>
      </Collapse>
    </>
  );
};

const Linkbox = ({ linkItem }) => {
  const { fileName, filePath, link } = linkItem;
  return (
    <Card>
      <Text fontWeight="bold">{fileName}</Text>
      <Text color="gray.500">{link}</Text>
      <Text>Path: {filePath}</Text>
    </Card>
  );
};

export default SharedLinks;
