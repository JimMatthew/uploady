import { Flex, Text, Icon, Box, useBreakpointValue } from "@chakra-ui/react";
import { FiCopy, FiShare2, FiTrash2, FiX } from "react-icons/fi";

const ToolbarBtn = ({ icon, label, onClick, disabled, danger }) => (
  <Flex
    align="center"
    gap="6px"
    px={3}
    h="28px"
    borderRadius="6px"
    cursor={disabled ? "not-allowed" : "pointer"}
    border="1px solid"
    borderColor={
      disabled ? "rgba(255,255,255,0.05)"
      : danger ? "rgba(239,68,68,0.2)"
      : "rgba(255,255,255,0.08)"
    }
    color={
      disabled ? "rgba(255,255,255,0.15)"
      : danger ? "rgba(239,68,68,0.6)"
      : "rgba(255, 255, 255, 0.5)"
    }
    bg="transparent"
    fontSize="12px"
    fontWeight={500}
    transition="all 0.12s"
    opacity={disabled ? 0.5 : 1}
    _hover={!disabled ? {
      bg: danger ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.05)",
      borderColor: danger ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.18)",
      color: danger ? "#EF4444" : "rgba(255,255,255,0.8)",
    } : {}}
    onClick={!disabled ? onClick : undefined}
  >
    <Icon as={icon} boxSize="12px" />
    {label}
  </Flex>
);

const Toolbar = ({ selected, handleCopy, handleShare, handleDelete, handleClear }) => {
  const isDesktop = useBreakpointValue({ base: false, lg: true });
  const hasSelection = selected.size > 0;

  return (
    <Flex
      align="center"
      gap={2}
      px={4}
      py="8px"
      mb={1}
      borderBottom="1px solid rgba(255,255,255,0.05)"
      minH="44px"
    >
      <ToolbarBtn icon={FiCopy}   label="Copy"   onClick={handleCopy}   disabled={!hasSelection} />
      <ToolbarBtn icon={FiShare2} label="Share"  onClick={handleShare}  disabled={!hasSelection} />
      <ToolbarBtn icon={FiTrash2} label="Delete" onClick={handleDelete} disabled={!hasSelection} danger />

      {hasSelection && (
        <>
          <Box w="1px" h="16px" bg="rgba(255,255,255,0.07)" mx={1} />
          <Flex align="center" gap={2}>
            {isDesktop && (
              <Text fontSize="11px" color="rgba(255, 255, 255, 0.5)" letterSpacing="0.02em">
                {selected.size} selected
              </Text>
            )}
            <Flex
              w="20px" h="20px"
              align="center" justify="center"
              borderRadius="4px"
              cursor="pointer"
              color="rgba(255, 255, 255, 0.35)"
              transition="all 0.12s"
              _hover={{ bg: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)" }}
              onClick={handleClear}
            >
              <Icon as={FiX} boxSize="11px" />
            </Flex>
          </Flex>
        </>
      )}
    </Flex>
  );
};

export default Toolbar;