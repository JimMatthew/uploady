import {
  Flex,
  Heading,
  Text,
  Button,
  Spacer,
  Box,
  IconButton,
  useBreakpointValue,
  useColorMode,
} from "@chakra-ui/react";
import { FaSignOutAlt } from "react-icons/fa";
import DarkModeToggle from "./DarkModeToggle";
const Header = ({ username, onLogout }) => {
  const headingSize = useBreakpointValue({ base: "md", md: "lg" });
  const showLogoutText = useBreakpointValue({ base: false, md: true });
  const handleLogout = async () => {
    try {
      const response = await fetch("/apilogout", { method: "GET" });
      if (response.ok) {
        // Handle successful logout (e.g., redirect to login page)
        window.location.href = "/"; // Redirect to home or login page
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };
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
        <DarkModeToggle />
      </Box>
      <Box>
        <Text fontSize={{ base: "sm", md: "md" }} mr={4} fontWeight="semibold">
          Logged in as: {username}
        </Text>
      </Box>

      {showLogoutText ? (
        <Button
          leftIcon={<FaSignOutAlt />}
          colorScheme="orange"
          onClick={handleLogout}
        >
          Logout
        </Button>
      ) : (
        <IconButton
          aria-label="Logout"
          icon={<FaSignOutAlt />}
          colorScheme="red"
          onClick={handleLogout}
        />
      )}
    </Flex>
  );
};

export default Header;
