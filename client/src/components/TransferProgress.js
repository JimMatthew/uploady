import { Box, Flex, Icon, Text } from "@chakra-ui/react";

import { FiArrowRight, FiCheck, FiFolder } from "react-icons/fi";

const TransferProgress = ({ transfers, progressMap }) => (
  <Box mb={3} display="flex" flexDirection="column" gap={2}>
    {Object.entries(transfers).map(([id, { file }]) => {
      const entry = progressMap[id] || {};

      const pct = entry.progress ?? 0;

      const completed = entry.completed ?? 0;

      const total = entry.total ?? 0;

      const isFolder =
        completed > 0 || (total > 0 && pct === 0 && completed === 0);

      const done = isFolder ? total > 0 && completed >= total : pct >= 100;

      const displayPct = Math.min(
        100,
        Math.max(
          0,
          isFolder ? (total > 0 ? (completed / total) * 100 : 0) : pct,
        ),
      );

      const statusText = done
        ? "Complete"
        : isFolder
          ? `${completed} / ${total || "?"} files`
          : `${Math.round(pct)}%`;

      return (
        <Box
          key={id}
          px={3}
          py="10px"
          bg={done ? "rgba(111,207,151,0.025)" : "rgba(255,255,255,0.025)"}
          border="1px solid"
          borderColor={
            done ? "rgba(111,207,151,0.12)" : "rgba(255,255,255,0.07)"
          }
          borderRadius="9px"
          transition="
              background 200ms ease,
              border-color 200ms ease
            "
        >
          <Flex align="center" justify="space-between" gap={3} mb="8px">
            <Flex align="center" gap={2} minW={0}>
              <Flex
                align="center"
                justify="center"
                w="24px"
                h="24px"
                flexShrink={0}
                borderRadius="6px"
                bg={done ? "rgba(111,207,151,0.08)" : "rgba(129,140,248,0.08)"}
                border="1px solid"
                borderColor={
                  done ? "rgba(111,207,151,0.13)" : "rgba(129,140,248,0.13)"
                }
              >
                <Icon
                  as={done ? FiCheck : isFolder ? FiFolder : FiArrowRight}
                  boxSize="11px"
                  color={done ? "#7FD6A1" : "#A5B4FC"}
                />
              </Flex>

              <Text
                minW={0}
                noOfLines={1}
                fontSize="11px"
                fontWeight={500}
                fontFamily="'JetBrains Mono', monospace"
                color="rgba(255,255,255,0.68)"
                letterSpacing="-0.01em"
              >
                {file}
              </Text>
            </Flex>

            <Text
              flexShrink={0}
              fontSize="10px"
              fontWeight={600}
              letterSpacing="0.01em"
              color={done ? "rgba(111,207,151,0.86)" : "rgba(165,180,252,0.82)"}
              fontFamily="'JetBrains Mono', monospace"
            >
              {statusText}
            </Text>
          </Flex>

          <Box
            h="3px"
            bg="rgba(255,255,255,0.055)"
            borderRadius="full"
            overflow="hidden"
          >
            <Box
              h="100%"
              w={`${displayPct}%`}
              bg={done ? "#6FCF97" : "#818CF8"}
              borderRadius="full"
              transition="
                  width 180ms ease,
                  background 200ms ease
                "
            />
          </Box>
        </Box>
      );
    })}
  </Box>
);

export default TransferProgress;
