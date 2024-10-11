import React, { useState } from "react";
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
      bg="white"
      p={6}
      borderRadius="sm"
      boxShadow="sm"
      border="1px solid"
      borderColor="gray.200"
      maxW="sm"
      mx="auto"
      mt={6}
    >
      <VStack as="form" spacing={4} onSubmit={handleSave}>
        <Heading size="md" mb={4} color="gray.800" fontWeight="medium">
          Add New Server
        </Heading>

        <FormControl id="host" isRequired>
          <FormLabel fontSize="sm" fontWeight="medium" color="gray.600">
            Host
          </FormLabel>
          <Input
            name="host"
            placeholder="Enter server host"
            value={newServerDetails.host}
            onChange={handleInputChange}
            bg="gray.50"
            border="1px solid"
            borderColor="gray.300"
            borderRadius="none"
            _hover={{ borderColor: "gray.400" }}
            _focus={{ borderColor: "blue.400", boxShadow: "none" }}
          />
        </FormControl>

        <FormControl id="username" isRequired>
          <FormLabel fontSize="sm" fontWeight="medium" color="gray.600">
            Username
          </FormLabel>
          <Input
            name="username"
            placeholder="Enter username"
            value={newServerDetails.username}
            onChange={handleInputChange}
            bg="gray.50"
            border="1px solid"
            borderColor="gray.300"
            borderRadius="none"
            _hover={{ borderColor: "gray.400" }}
            _focus={{ borderColor: "blue.400", boxShadow: "none" }}
          />
        </FormControl>

        <FormControl id="password" isRequired>
          <FormLabel fontSize="sm" fontWeight="medium" color="gray.600">
            Password
          </FormLabel>
          <Input
            name="password"
            type="password"
            placeholder="Enter password"
            value={newServerDetails.password}
            onChange={handleInputChange}
            bg="gray.50"
            border="1px solid"
            borderColor="gray.300"
            borderRadius="none"
            _hover={{ borderColor: "gray.400" }}
            _focus={{ borderColor: "blue.400", boxShadow: "none" }}
          />
        </FormControl>

        <Button
          colorScheme="blue"
          type="submit"
          width="full"
          bg="blue.500"
          borderRadius="none"
          _hover={{ bg: "blue.600" }}
          _focus={{ boxShadow: "none" }}
        >
          Save Server
        </Button>
      </VStack>
    </Box>
  );
};

export default AddServer;
