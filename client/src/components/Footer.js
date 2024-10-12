import { Box, Text, Stack, Link } from "@chakra-ui/react";

const Footer = () => {
  return (
    <Box
      as="footer"
      bg="gray.800"
      color="white"
      p={4}
      position="relative"
      bottom="0"
      width="100%"
    >
      <Stack spacing={2} align="center">
        <Text>© {new Date().getFullYear()} James Lindstrom. All rights reserved.</Text>
        <Stack direction="row" spacing={4}>
          <Link href="/privacy" color="teal.300">Privacy Policy</Link>
          <Link href="/terms" color="teal.300">Terms Of Service</Link>
        </Stack>
      </Stack>
    </Box>
  );
};

export default Footer;