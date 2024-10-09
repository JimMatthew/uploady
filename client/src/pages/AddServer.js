import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  VStack,
  Heading,
  Input,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";

const AddServer = ({ handleSaveServer }) => {
  const [newServerDetails, setNewServerDetails] = useState({
    host: "",
    username: "",
    password: "",
  });

  const handleInputChange = (e) => {
    setNewServerDetails({
      ...newServerDetails,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = (e) => {
    e.preventDefault();

    handleSaveServer(
      newServerDetails.host,
      newServerDetails.username,
      newServerDetails.password
    );
    setNewServerDetails({ host: "", username: "", password: "" });
  };

  return (
    <Box
      bg="gray.50"
      p={6}
      borderRadius="md"
      boxShadow="md"
      maxW="md"
      mx="auto"
      mt={6}
    >
      <VStack as="form" spacing={4} onSubmit={handleSave}>
        <Heading size="md" mb={4} color="gray.700">
          Add New Server
        </Heading>

        <FormControl id="host" isRequired>
          <FormLabel>Host</FormLabel>
          <Input
            name="host"
            placeholder="Enter server host"
            value={newServerDetails.host}
            onChange={handleInputChange}
            bg="white"
            borderColor="gray.300"
            _hover={{ borderColor: "gray.500" }}
            _focus={{ borderColor: "blue.500" }}
          />
        </FormControl>

        <FormControl id="username" isRequired>
          <FormLabel>Username</FormLabel>
          <Input
            name="username"
            placeholder="Enter username"
            value={newServerDetails.username}
            onChange={handleInputChange}
            bg="white"
            borderColor="gray.300"
            _hover={{ borderColor: "gray.500" }}
            _focus={{ borderColor: "blue.500" }}
          />
        </FormControl>

        <FormControl id="password" isRequired>
          <FormLabel>Password</FormLabel>
          <Input
            name="password"
            type="password"
            placeholder="Enter password"
            value={newServerDetails.password}
            onChange={handleInputChange}
            bg="white"
            borderColor="gray.300"
            _hover={{ borderColor: "gray.500" }}
            _focus={{ borderColor: "blue.500" }}
          />
        </FormControl>

        <Button
          colorScheme="blue"
          type="submit"
          width="full"
          mt={4}
          _hover={{ bg: "blue.600" }}
        >
          Save Server
        </Button>
      </VStack>
    </Box>
  );
};

export default AddServer;
