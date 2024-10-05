import { Flex, Heading, Text, Button, Spacer, Box, IconButton, useBreakpointValue } from "@chakra-ui/react";
import { FaSignOutAlt } from "react-icons/fa";

const Header = ({ username, onLogout }) => {
  // Dynamically adjust the heading size and button text based on screen size
  const headingSize = useBreakpointValue({ base: "md", md: "lg" });
  const showLogoutText = useBreakpointValue({ base: false, md: true });

  return (
    <Flex
      as="header"
      bg="blue.700"
      color="white"
      p={4}
      align="center"
      boxShadow="md"
      position="sticky"
      top={0}
      zIndex={10}
    >
      {/* Heading with dynamic size */}
      <Heading as="h1" size={headingSize}>
        Uploady File Manager
      </Heading>

      {/* Spacer to push items apart */}
      <Spacer />

      {/* Username display */}
      <Box>
        <Text fontSize={{ base: "sm", md: "md" }} mr={4} fontWeight="semibold">
          Logged in as: {username}
        </Text>
      </Box>

      {/* Logout button - switches between text and icon based on screen size */}
      {showLogoutText ? (
        <Button leftIcon={<FaSignOutAlt />} colorScheme="orange" onClick={onLogout}>
          Logout
        </Button>
      ) : (
        <IconButton
          aria-label="Logout"
          icon={<FaSignOutAlt />}
          colorScheme="red"
          onClick={onLogout}
        />
      )}
    </Flex>
  );
};

export default Header;
