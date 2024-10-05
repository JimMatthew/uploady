import { Flex, Heading, Text, Button, Spacer, Box, IconButton, useBreakpointValue } from "@chakra-ui/react";
import { FaSignOutAlt } from "react-icons/fa";

const Header = ({ username, onLogout }) => {
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
      <Heading as="h1" size={headingSize}>
        Uploady File Manager
      </Heading>

      <Spacer />

      <Box>
        <Text fontSize={{ base: "sm", md: "md" }} mr={4} fontWeight="semibold">
          Logged in as: {username}
        </Text>
      </Box>

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
