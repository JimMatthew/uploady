import { Box, Flex, Text, Link } from "@chakra-ui/react";

const Footer = () => {
  return (
    <Box
      as="footer"
      borderTop="1px solid rgba(255,255,255,0.06)"
      bg="rgba(8,8,12,0.8)"
      px={6}
      py={4}
      width="100%"
    >
      <Flex
        align="center"
        justify="space-between"
        maxW="1200px"
        mx="auto"
        flexWrap="wrap"
        gap={3}
      >
        <Text
          fontSize="12px"
          fontFamily="'JetBrains Mono', monospace"
          color="rgba(255, 255, 255, 0.45)"
          letterSpacing="-0.01em"
        >
          © {new Date().getFullYear()} James Lindstrom
        </Text>

        <Flex gap={5}>
          {[["About", "/about"], ["Terms of Service", "/terms"]].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              fontSize="12px"
              color="rgba(255, 255, 255, 0.45)"
              letterSpacing="-0.01em"
              textDecoration="none"
              transition="color 0.12s"
              _hover={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}
            >
              {label}
            </Link>
          ))}
        </Flex>
      </Flex>
    </Box>
  );
};

export default Footer;