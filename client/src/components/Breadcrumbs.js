import React from "react";
import { Flex, Text, Icon } from "@chakra-ui/react";
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
      minW={0}
    >
      {/* Home icon + first crumb as a single clickable unit */}
      <Flex
        align="center"
        gap={1}
        cursor="pointer"
        role="group"
        flexShrink={0}
        onClick={() => onClick(breadcrumb?.[0]?.path ?? "/")}
      >
        <Icon
          as={FiHome}
          boxSize="12px"
          color={
            breadcrumb?.length === 1
              ? "rgba(255,255,255,0.85)"
              : "rgba(255,255,255,0.3)"
          }
          transition="color 0.12s"
          _groupHover={
            breadcrumb?.length > 1 ? { color: "rgba(255,255,255,0.7)" } : {}
          }
        />
        {breadcrumb?.[0] && (
          <Text
            fontSize="12px"
            fontWeight={breadcrumb.length === 1 ? 600 : 450}
            color={
              breadcrumb.length === 1
                ? "rgba(255,255,255,0.85)"
                : "rgba(255,255,255,0.32)"
            }
            fontFamily="'JetBrains Mono', monospace"
            letterSpacing="-0.01em"
            whiteSpace="nowrap"
            transition="color 0.12s"
            _groupHover={
              breadcrumb.length > 1 ? { color: "rgba(255,255,255,0.7)" } : {}
            }
          >
            {breadcrumb[0].name}
          </Text>
        )}
      </Flex>

      {/* Remaining crumbs */}
      {breadcrumb?.slice(1).map((crumb, index) => {
        const isLast = index === breadcrumb.length - 2;

        return (
          <Flex key={index} align="center" gap={1} minW={0}>
            <Icon
              as={FiChevronRight}
              boxSize="10px"
              color="rgba(255,255,255,0.12)"
              flexShrink={0}
            />
            <Text
              fontSize="12px"
              fontWeight={isLast ? 600 : 450}
              color={
                isLast ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.32)"
              }
              fontFamily="'JetBrains Mono', monospace"
              letterSpacing="-0.01em"
              whiteSpace="nowrap"
              cursor={!isLast ? "pointer" : "default"}
              transition="color 0.12s"
              _hover={!isLast ? { color: "rgba(255,255,255,0.7)" } : {}}
              onClick={() => !isLast && onClick(crumb.path)}
            >
              {crumb.name}
            </Text>
          </Flex>
        );
      })}
    </Flex>
  );
};

export default Breadcrumbs;
