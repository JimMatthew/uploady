import React from 'react'
import {
    Box,
    Flex,
    Heading,
    Text,
    Spacer,
    Button,
  } from "@chakra-ui/react";

  const Header = ({username}) => {

    return(
        <Flex as="header" bg="teal.500" color="white" p={4} align="center">
        <Heading as="h1" size="lg">
          Uploady File Manager
        </Heading>
        <Spacer />
        <Text mr={4}>Logged in as: {username}</Text>
        <Button  >
          View Shared Files
        </Button>
      </Flex>
    )
  }

  export default Header
