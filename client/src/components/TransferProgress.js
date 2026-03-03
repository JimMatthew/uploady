import { Box, Flex, Text, Icon } from "@chakra-ui/react";
import { FiArrowRight } from "react-icons/fi";

const TransferProgress = ({ transfers, progressMap }) => (
  <Box mb={3} display="flex" flexDirection="column" gap={2}>
    {Object.entries(transfers).map(([id, { file }]) => {
      const pct = progressMap[id]?.progress || 0;
      const done = pct >= 100;
      return (
        <Box
          key={id}
          px={4} py={3}
          bg="rgba(255,255,255,0.02)"
          border="1px solid"
          borderColor={done ? "rgba(34,197,94,0.2)" : "rgba(99,102,241,0.15)"}
          borderRadius="9px"
          transition="border-color 0.3s"
        >
          <Flex align="center" justify="space-between" mb={2}>
            <Flex align="center" gap={2} minW={0}>
              <Icon
                as={FiArrowRight}
                boxSize="12px"
                color={done ? "#22C55E" : "#6366F1"}
                flexShrink={0}
                transition="color 0.3s"
              />
              <Text
                fontSize="12px"
                fontFamily="'JetBrains Mono', monospace"
                color="rgba(255,255,255,0.6)"
                noOfLines={1}
                letterSpacing="-0.01em"
              >
                {file}
              </Text>
            </Flex>
            <Text
              fontSize="11px"
              fontWeight={600}
              color={done ? "#4ADE80" : "rgba(99,102,241,0.9)"}
              letterSpacing="0.02em"
              flexShrink={0}
              ml={3}
              transition="color 0.3s"
            >
              {done ? "done" : `${Math.round(pct)}%`}
            </Text>
          </Flex>

          {/* Progress track */}
          <Box
            h="2px"
            bg="rgba(255,255,255,0.06)"
            borderRadius="full"
            overflow="hidden"
          >
            <Box
              h="100%"
              w={`${pct}%`}
              bg={done
                ? "linear-gradient(90deg, #22C55E, #4ADE80)"
                : "linear-gradient(90deg, #6366F1, #818CF8)"
              }
              borderRadius="full"
              transition="width 0.2s ease, background 0.3s"
            />
          </Box>
        </Box>
      );
    })}
  </Box>
);

export default TransferProgress;