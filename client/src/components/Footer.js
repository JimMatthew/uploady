import { Flex, Link, Text } from "@chakra-ui/react";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <Flex
      as="footer"
      align="center"
      justify="space-between"
      px={4}
      h="32px"
      flexShrink={0}
      bg="#151821"
      borderTop="1px solid"
      borderColor="rgba(255,255,255,0.055)"
    >
      <Text
        fontSize="10px"
        fontFamily="'JetBrains Mono', monospace"
        color="rgba(255,255,255,0.28)"
        letterSpacing="-0.01em"
        userSelect="none"
      >
        © {year} James Lindstrom
      </Text>

      <Link
        href="/about"
        px="6px"
        py="3px"
        borderRadius="5px"
        fontSize="10px"
        fontWeight={500}
        fontFamily="'JetBrains Mono', monospace"
        color="rgba(255,255,255,0.3)"
        letterSpacing="-0.01em"
        textDecoration="none"
        transition="
          background 120ms ease,
          color 120ms ease
        "
        _hover={{
          bg: "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.65)",
          textDecoration: "none",
        }}
      >
        About
      </Link>
    </Flex>
  );
};

export default Footer;
