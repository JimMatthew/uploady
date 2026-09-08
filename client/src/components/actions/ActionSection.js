import React, { useState } from "react";
import { Box, Flex, Text, Icon, Collapse } from "@chakra-ui/react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";

const ActionSection = ({
  icon,
  title,
  description,
  children,
  headerExtra,
  collapsible = false,
  defaultOpen = true,
  isOpen: isOpenProp,
  onToggle,
}) => {
  const isControlled = isOpenProp !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = isControlled ? isOpenProp : internalOpen;
  const toggle = isControlled
    ? onToggle
    : () => setInternalOpen((prev) => !prev);
  const canToggle = collapsible;

  return (
    <Box
      mb={5}
      border="1px solid rgba(255,255,255,0.06)"
      borderRadius="10px"
      bg="rgba(255,255,255,0.015)"
      overflow="hidden"
    >
      <Flex
        align="center"
        gap={3}
        px={5}
        py={4}
        borderBottom={isOpen ? "1px solid rgba(255,255,255,0.06)" : "none"}
        cursor={canToggle ? "pointer" : "default"}
        onClick={canToggle ? toggle : undefined}
        role={canToggle ? "button" : undefined}
        tabIndex={canToggle ? 0 : undefined}
        onKeyDown={
          canToggle
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggle();
                }
              }
            : undefined
        }
      >
        <Flex
          align="center"
          justify="center"
          w="30px"
          h="30px"
          borderRadius="7px"
          bg="rgba(99,102,241,0.1)"
          color="#818CF8"
          flexShrink={0}
        >
          <Icon as={icon} boxSize="14px" />
        </Flex>

        <Box flex={1} minW={0}>
          <Text fontSize="13px" fontWeight={600} color="rgba(255,255,255,0.8)">
            {title}
          </Text>

          <Text fontSize="11px" color="rgba(255,255,255,0.3)">
            {description}
          </Text>
        </Box>

        {headerExtra && (
          <Box onClick={(event) => event.stopPropagation()}>{headerExtra}</Box>
        )}

        {canToggle && (
          <Icon
            as={isOpen ? FiChevronDown : FiChevronRight}
            boxSize="14px"
            color="rgba(255,255,255,0.3)"
            flexShrink={0}
          />
        )}
      </Flex>

      {collapsible ? (
        <Collapse in={isOpen} animateOpacity>
          <Box p={5}>{children}</Box>
        </Collapse>
      ) : (
        <Box p={5}>{children}</Box>
      )}
    </Box>
  );
};

export default ActionSection;
