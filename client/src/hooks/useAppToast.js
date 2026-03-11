import { useToast } from "@chakra-ui/react";
import { Box, Flex, Text, Input, Icon } from "@chakra-ui/react";
const useAppToast = () => {
  const toast = useToast();

  return ({ title, description, status = "info", duration = 2500 }) =>
    toast({
      title,
      description,
      status,
      duration,
      isClosable: true,
      position: "bottom",
      containerStyle: {
        marginBottom: "44px",
        marginRight: "12px",
      },
      render: () => (
        <Box
          px={4}
          py={3}
          bg="rgba(22,26,38,0.98)"
          backdropFilter="blur(20px)"
          border="1px solid"
          borderColor={
            status === "error"
              ? "rgba(239,68,68,0.6)"
              : status === "success"
                ? "rgba(34,197,94,0.6)"
                : status === "warning"
                  ? "rgba(251,191,36,0.6)"
                  : "rgba(99,102,241,0.6)"
          }
          borderRadius="10px"
          boxShadow="0 8px 32px rgba(0,0,0,0.4)"
          display="flex"
          alignItems="flex-start"
          gap={3}
          minW="260px"
          maxW="360px"
        >
          {/* Status dot */}
          <Box
            w="8px"
            h="8px"
            borderRadius="full"
            flexShrink={0}
            mt="3px"
            bg={
              status === "error"
                ? "#EF4444"
                : status === "success"
                  ? "#22C55E"
                  : status === "warning"
                    ? "#FBbf24"
                    : "#818CF8"
            }
            boxShadow={
              status === "error"
                ? "0 0 10px rgba(239,68,68,0.9)"
                : status === "success"
                  ? "0 0 10px rgba(34,197,94,0.9)"
                  : status === "warning"
                    ? "0 0 10px rgba(251,191,36,0.9)"
                    : "0 0 10px rgba(99,102,241,0.9)"
            }
          />

          <Box flex={1} minW={0}>
            {title && (
              <Text
                fontSize="13px"
                fontWeight={600}
                color="rgba(255,255,255,0.88)"
                letterSpacing="-0.01em"
                fontFamily="'JetBrains Mono', monospace"
                noOfLines={1}
              >
                {title}
              </Text>
            )}
            {description && (
              <Text
                fontSize="12px"
                color="rgba(255,255,255,0.45)"
                mt="2px"
                noOfLines={2}
              >
                {description}
              </Text>
            )}
          </Box>
        </Box>
      ),
    });
};

export default useAppToast;
