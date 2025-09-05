import React, { useState } from "react";
import {
  Box,
  Button,
  VStack,
  Heading,
  Input,
  FormControl,
  FormLabel,
  Select,
  useColorModeValue,
  Textarea,
} from "@chakra-ui/react";

const AddServer = ({ handleSaveServer }) => {
  const [newServerDetails, setNewServerDetails] = useState({
    host: "",
    username: "",
    authMethod: "password", 
    password: "",
    privateKey: "",
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
      newServerDetails.authMethod === "password"
        ? newServerDetails.password
        : newServerDetails.privateKey,
      newServerDetails.authMethod
    );
    setNewServerDetails({
      host: "",
      username: "",
      authMethod: "password",
      password: "",
      privateKey: "",
    });
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

        {/* Host */}
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
          />
        </FormControl>

        {/* Username */}
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
          />
        </FormControl>

        {/* Auth Method */}
        <FormControl id="authMethod" isRequired>
          <FormLabel fontSize="md" fontWeight="medium" color={labelColor}>
            Authentication Method
          </FormLabel>
          <Select
            name="authMethod"
            value={newServerDetails.authMethod}
            onChange={handleInputChange}
            bg={inputBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="md"
          >
            <option value="password">Password</option>
            <option value="key">SSH Key</option>
          </Select>
        </FormControl>

        {/* Password (only if password auth) */}
        {newServerDetails.authMethod === "password" && (
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
            />
          </FormControl>
        )}

        {/* Private Key (only if key auth) */}
        {newServerDetails.authMethod === "key" && (
          <FormControl id="privateKey" isRequired>
            <FormLabel fontSize="md" fontWeight="medium" color={labelColor}>
              Private Key
            </FormLabel>
            <Textarea
              name="privateKey"
              placeholder="Paste private key here"
              value={newServerDetails.privateKey}
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
              rows={8} 
            />
          </FormControl>
        )}

        <Button colorScheme="blue" type="submit" width="full" borderRadius="md">
          Save Server
        </Button>
      </VStack>
    </Box>
  );
};

export default AddServer;
