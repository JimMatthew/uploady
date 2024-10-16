import React, { useState } from "react";
import {
  Box,
  Button,
  VStack,
  Heading,
  Input,
  FormControl,
  FormLabel,
  useColorModeValue,
} from "@chakra-ui/react";

const AddServer = ({ handleSaveServer }) => {
  const [newServerDetails, setNewServerDetails] = useState({
    host: "",
    username: "",
    password: "",
  });
  const boxBg = useColorModeValue("white", "gray.700");
  const inputBg = useColorModeValue("gray.50", "gray.800");
  const borderColor = useColorModeValue("gray.300", "gray.600");
  const labelColor = useColorModeValue("gray.600", "gray.300");
  const headingColor = useColorModeValue("gray.800", "white");
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
      bg={boxBg}
      p={8}
      borderRadius="lg"
      boxShadow="lg"
      border="1px solid"
      borderColor={borderColor}
      maxW="sm"
      mx="auto"
      mt={10}
    >
      <VStack as="form" spacing={6} onSubmit={handleSave}>
        <Heading size="lg" color={headingColor} fontWeight="bold">
          Add New Server
        </Heading>

        <FormControl id="host" isRequired>
          <FormLabel fontSize="md" fontWeight="medium" color={labelColor}>
            Host
          </FormLabel>
          <Input
            name="host"
            placeholder="Enter server host"
            value={newServerDetails.host}
            onChange={handleInputChange}
            bg={inputBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="md"
            _hover={{ borderColor: "blue.400" }}
            _focus={{
              borderColor: "blue.500",
              boxShadow: "0 0 0 1px blue.500",
            }}
            transition="border-color 0.2s ease, box-shadow 0.2s ease"
          />
        </FormControl>

        <FormControl id="username" isRequired>
          <FormLabel fontSize="md" fontWeight="medium" color={labelColor}>
            Username
          </FormLabel>
          <Input
            name="username"
            placeholder="Enter username"
            value={newServerDetails.username}
            onChange={handleInputChange}
            bg={inputBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="md"
            _hover={{ borderColor: "blue.400" }}
            _focus={{
              borderColor: "blue.500",
              boxShadow: "0 0 0 1px blue.500",
            }}
            transition="border-color 0.2s ease, box-shadow 0.2s ease"
          />
        </FormControl>

        <FormControl id="password" isRequired>
          <FormLabel fontSize="md" fontWeight="medium" color={labelColor}>
            Password
          </FormLabel>
          <Input
            name="password"
            type="password"
            placeholder="Enter password"
            value={newServerDetails.password}
            onChange={handleInputChange}
            bg={inputBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="md"
            _hover={{ borderColor: "blue.400" }}
            _focus={{
              borderColor: "blue.500",
              boxShadow: "0 0 0 1px blue.500",
            }}
            transition="border-color 0.2s ease, box-shadow 0.2s ease"
          />
        </FormControl>

        <Button
          colorScheme="blue"
          type="submit"
          width="full"
          bg="blue.500"
          borderRadius="md"
          _hover={{ bg: "blue.600" }}
          _focus={{ boxShadow: "0 0 0 3px rgba(66, 153, 225, 0.6)" }}
          transition="background-color 0.2s ease, box-shadow 0.2s ease"
        >
          Save Server
        </Button>
      </VStack>
    </Box>
  );
};

export default AddServer;
