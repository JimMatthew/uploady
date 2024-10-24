import React, { useState } from "react";
import {
  Button,
  Input,
  Box,
  HStack,
  FormControl,
  useColorModeValue,
  Progress
} from "@chakra-ui/react";

function Upload({ handleSubmit, handleFileChange, uploadProgress }) {
  
  return (
    <Box
      as="form"
      onSubmit={handleSubmit}
      p={4}
      shadow="md"
      borderWidth="1px"
      borderRadius="lg"
      background={useColorModeValue("gray.50", "gray.800")}
      maxW="lg"
      mx="auto"
    >
      <FormControl>
        <HStack spacing={4} align="center">
          <Input
            type="file"
            onChange={handleFileChange}
            variant="unstyled"
            _focus={{ outline: "none" }}
            p={2}
            bg={useColorModeValue("white", "gray.700")}
            borderWidth="1px"
            borderRadius="md"
            size="md"
          />
          <Button
            colorScheme="blue"
            type="submit"
            size="md"
            px={6}
            _hover={{ bg: "blue.600" }}
          >
            Upload
          </Button>
        </HStack>
        {uploadProgress > 0 && (
          <Progress mt={4} value={uploadProgress} size="sm" colorScheme="blue" />
        )}
      </FormControl>
    </Box>
  );
}

export default Upload;