import React from "react";
import { Flex, Icon, Text } from "@chakra-ui/react";
import { FiChevronRight, FiHome } from "react-icons/fi";

const Breadcrumbs = ({ breadcrumb = [], onClick }) => {
  if (!breadcrumb.length) {
    return null;
  }

  return (
    <Flex
      align="center"
      gap="3px"
      px="10px"
      h="32px"
      maxW="100%"
      minW={0}
      overflowX="auto"
      overflowY="hidden"
      bg="rgba(255,255,255,0.018)"
      border="1px solid"
      borderColor="rgba(255,255,255,0.065)"
      borderRadius="7px"
      whiteSpace="nowrap"
      sx={{
        "::-webkit-scrollbar": {
          height: "0px",
        },
        scrollbarWidth: "none",
      }}
    >
      <BreadcrumbItem
        icon={FiHome}
        name={breadcrumb[0].name}
        active={breadcrumb.length === 1}
        onClick={() => onClick(breadcrumb[0].path ?? "/")}
      />

      {breadcrumb.slice(1).map((crumb, index) => {
        const isLast = index === breadcrumb.length - 2;

        return (
          <Flex
            key={`${crumb.path}:${index}`}
            align="center"
            gap="3px"
            flexShrink={0}
          >
            <Icon
              as={FiChevronRight}
              boxSize="10px"
              flexShrink={0}
              color="rgba(255,255,255,0.14)"
            />

            <BreadcrumbItem
              name={crumb.name}
              active={isLast}
              onClick={isLast ? undefined : () => onClick(crumb.path)}
            />
          </Flex>
        );
      })}
    </Flex>
  );
};

const BreadcrumbItem = ({ icon, name, active, onClick }) => {
  const clickable = Boolean(onClick);

  return (
    <Flex
      as={clickable ? "button" : "div"}
      type={clickable ? "button" : undefined}
      align="center"
      gap="5px"
      h="24px"
      px="4px"
      flexShrink={0}
      borderRadius="5px"
      cursor={clickable ? "pointer" : "default"}
      color={active ? "rgba(255,255,255,0.84)" : "rgba(255,255,255,0.38)"}
      bg="transparent"
      border="none"
      transition="
        background 120ms ease,
        color 120ms ease
      "
      _hover={
        clickable
          ? {
              bg: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.72)",
            }
          : {}
      }
      onClick={onClick}
    >
      {icon && (
        <Icon
          as={icon}
          boxSize="11px"
          flexShrink={0}
          color={active ? "#A5B4FC" : "rgba(255,255,255,0.34)"}
        />
      )}

      <Text
        fontSize="11px"
        fontWeight={active ? 600 : 500}
        fontFamily="'JetBrains Mono', monospace"
        letterSpacing="-0.015em"
        whiteSpace="nowrap"
      >
        {name}
      </Text>
    </Flex>
  );
};

export default Breadcrumbs;
