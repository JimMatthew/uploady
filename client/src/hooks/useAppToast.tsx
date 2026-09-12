import { useCallback } from "react";
import { Box, Text, useToast } from "@chakra-ui/react";

export type AppToastStatus = "error" | "success" | "warning" | "info";

interface StatusStyle {
  border: string;
  dot: string;
  glow: string;
}

interface AppToastOptions {
  title?: string;
  description?: string;
  status?: AppToastStatus;
  duration?: number;
}

const STATUS_STYLES: Record<AppToastStatus, StatusStyle> = {
  error: {
    border: "rgba(239,68,68,0.6)",
    dot: "#EF4444",
    glow: "rgba(239,68,68,0.9)",
  },
  success: {
    border: "rgba(34,197,94,0.6)",
    dot: "#22C55E",
    glow: "rgba(34,197,94,0.9)",
  },
  warning: {
    border: "rgba(251,191,36,0.6)",
    dot: "#FBBF24",
    glow: "rgba(251,191,36,0.9)",
  },
  info: {
    border: "rgba(99,102,241,0.6)",
    dot: "#818CF8",
    glow: "rgba(99,102,241,0.9)",
  },
};

const DEFAULT_STATUS: AppToastStatus = "info";

export type AppToast = (
  options: AppToastOptions,
) => ReturnType<ReturnType<typeof useToast>>;

const useAppToast = (): AppToast => {
  const toast = useToast();

  return useCallback(
    ({
      title,
      description,
      status = DEFAULT_STATUS,
      duration = 2500,
    }: AppToastOptions) => {
      const style = STATUS_STYLES[status];

      return toast({
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
            borderColor={style.border}
            borderRadius="10px"
            boxShadow="0 8px 32px rgba(0,0,0,0.4)"
            display="flex"
            alignItems="flex-start"
            gap={3}
            minW="260px"
            maxW="360px"
          >
            <Box
              w="8px"
              h="8px"
              mt="3px"
              flexShrink={0}
              borderRadius="full"
              bg={style.dot}
              boxShadow={`0 0 10px ${style.glow}`}
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
                  mt="2px"
                  fontSize="12px"
                  color="rgba(255,255,255,0.45)"
                  noOfLines={2}
                >
                  {description}
                </Text>
              )}
            </Box>
          </Box>
        ),
      });
    },
    [toast],
  );
};

export default useAppToast;
