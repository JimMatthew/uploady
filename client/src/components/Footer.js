import { Flex, Text, Link } from "@chakra-ui/react";

const Footer = () => {
  return (
    <Flex
      as="footer"
      align="center"
      justify="space-between"
      px={4}
      h="32px"
      flexShrink={0}
      borderTop="1px solid rgba(255,255,255,0.05)"
      bg="gray.900"
    >
      <Text
        fontSize="11px"
        fontFamily="'JetBrains Mono', monospace"
        color="rgba(255,255,255,0.3)"
        letterSpacing="-0.01em"
      >
        © {new Date().getFullYear()} James Lindstrom
      </Text>
      <Link
        href="/about"
        fontSize="11px"
        fontFamily="'JetBrains Mono', monospace"
        color="rgba(255,255,255,0.3)"
        letterSpacing="-0.01em"
        textDecoration="none"
        transition="color 0.12s"
        _hover={{ color: "rgba(255,255,255,0.5)", textDecoration: "none" }}
      >
        About
      </Link>
    </Flex>
  );
};

export default Footer;
