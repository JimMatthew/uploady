import React from "react";
import { Flex, Text, Icon, Box } from "@chakra-ui/react";
import { FiChevronRight, FiHome } from "react-icons/fi";

const Breadcrumbs = ({ breadcrumb, onClick }) => {
  return (
    <Flex
      align="center"
      gap={1}
      px={3}
      h="36px"
      bg="rgba(255,255,255,0.02)"
      borderRadius="8px"
      border="1px solid rgba(255,255,255,0.06)"
      overflow="hidden"
      maxW="100%"
    >
      <Icon as={FiHome} boxSize="12px" color="rgba(255,255,255,0.25)" flexShrink={0} />

      {breadcrumb?.map((crumb, index) => (
        <Flex key={index} align="center" gap={1} minW={0}>
          <Icon as={FiChevronRight} boxSize="11px" color="rgba(255,255,255,0.15)" flexShrink={0} />
          <Text
            fontSize="12px"
            fontWeight={index === breadcrumb.length - 1 ? 600 : 450}
            color={
              index === breadcrumb.length - 1
                ? "rgba(255,255,255,0.8)"
                : "rgba(255,255,255,0.35)"
            }
            fontFamily="'JetBrains Mono', monospace"
            letterSpacing="-0.01em"
            noOfLines={1}
            cursor={index < breadcrumb.length - 1 ? "pointer" : "default"}
            transition="color 0.12s"
            _hover={
              index < breadcrumb.length - 1
                ? { color: "rgba(255,255,255,0.75)" }
                : {}
            }
            onClick={(e) => {
              e.preventDefault();
              onClick(crumb.path);
            }}
          >
            {crumb.name}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
};

export default Breadcrumbs;