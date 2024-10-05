import { Box, SimpleGrid, Card, CardHeader, CardBody, Heading, Text, Button, Stack, } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const SFTPServerList = () => {

    const token = localStorage.getItem("token");
    const [loading, setLoading] = useState(false);
    const [sftpServers, setSftpServers] = useState(null);
    useEffect(() => {
        if (token) {
        fetchFiles();
        } else {
        console.error("No token found");
        }
    }, [ token]);
    const handleConnect = (id) => {
        const sftpServers = []
      // Logic to connect to the server
      console.log("Connecting to server:", id);
    };
  
    const handleDelete = (id) => {
      // Logic to delete the server
      console.log("Deleting server:", id);
    };

    const fetchFiles = () => {
        setLoading(true);
        fetch("/sftp/api/", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
          .then((res) => res.json())
          .then((data) => setSftpServers(data))
          .then(setLoading(false))
          .catch((err) => console.error("Error fetching files:", err));
      };
      if (loading || !sftpServers) return <div>Loading...</div>;
  
    return (
        <Box p={5}>
        <Heading mb={6} textAlign="center">My SFTP Servers</Heading>
        <Link to="/api/files/">
        <Button>Go to File Manager</Button>
      </Link>
        <SimpleGrid spacing={4} templateColumns="repeat(auto-fill, minmax(300px, 1fr))">
          {sftpServers.servers.map((server) => (
            <Card
              key={server.id}
              shadow="md"
              borderWidth="1px"
              borderRadius="md"
              transition="transform 0.2s"
              _hover={{ transform: "scale(1.05)", boxShadow: "lg" }} // Hover effect
            >
              <CardHeader bg="teal.500" color="white" borderTopRadius="md">
                <Heading size="md">{server.name}</Heading>
              </CardHeader>
              <CardBody>
                <Stack spacing={2}>
                  <Text><strong>Host:</strong> {server.host}</Text>
                  <Text><strong>Status:</strong> {server.status}</Text>
                  <Stack direction="row" spacing={2} justify="space-between">
                    <Button colorScheme="green" onClick={() => handleConnect(server.id)}>
                      Connect
                    </Button>
                    <Button colorScheme="red" onClick={() => handleDelete(server.id)}>
                      Delete
                    </Button>
                  </Stack>
                </Stack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      </Box>
    );
  };
  
  export default SFTPServerList;