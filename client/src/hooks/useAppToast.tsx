import { useCallback, useState } from "react";
import {
  Box,
  Button,
  CloseButton,
  Text,
  useToast,
} from "@chakra-ui/react";

export type AppToastStatus =
  | "error"
  | "success"
  | "warning"
  | "info";

export interface AppToastDetail {
  label: string;
  message: string;
}

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
  persistent?: boolean;
  details?: AppToastDetail[];
}

interface AppToastContentProps {
  title?: string | undefined;
  description?: string | undefined;
  status: AppToastStatus;
  details?: AppToastDetail[] | undefined;
  onClose: () => void;
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
const DEFAULT_DURATION = 2500;

function AppToastContent({
  title,
  description,
  status,
  details,
  onClose,
}: AppToastContentProps) {
  const [expanded, setExpanded] = useState(false);

  const style = STATUS_STYLES[status];
  const hasDetails = details != null && details.length > 0;

  return (
    <Box
      px={4}
      py={3}
      bg="rgba(22,26,38,0.98)"
      backdropFilter="blur(20px)"
      border="1px solid"
      borderColor={style.border}
      borderRadius="10px"
      boxShadow="0 8px 32px rgba(0,0,0,0.4)"
      minW="260px"
      maxW="420px"
    >
      <Box
        display="flex"
        alignItems="flex-start"
        gap={3}
      >
        <Box
          w="8px"
          h="8px"
          mt="5px"
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
               {...(!expanded && { noOfLines: 2 })}
            >
              {description}
            </Text>
          )}

          {hasDetails && (
            <Button
              mt={2}
              p={0}
              h="auto"
              minW={0}
              variant="link"
              fontSize="11px"
              fontWeight={500}
              color="rgba(255,255,255,0.55)"
              _hover={{
                color: "rgba(255,255,255,0.85)",
                textDecoration: "none",
              }}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "Hide details" : "Show details"}
            </Button>
          )}
        </Box>

        <CloseButton
          size="sm"
          flexShrink={0}
          color="rgba(255,255,255,0.4)"
          _hover={{
            color: "rgba(255,255,255,0.85)",
            bg: "rgba(255,255,255,0.08)",
          }}
          onClick={onClose}
        />
      </Box>

      {hasDetails && expanded && (
        <Box
          mt={3}
          pt={3}
          borderTop="1px solid"
          borderColor="rgba(255,255,255,0.08)"
          maxH="220px"
          overflowY="auto"
        >
          {details.map((detail, index) => (
            <Box
              key={`${detail.label}-${index}`}
              mb={index < details.length - 1 ? 3 : 0}
            >
              <Text
                fontSize="11px"
                fontWeight={600}
                color="rgba(255,255,255,0.75)"
                fontFamily="'JetBrains Mono', monospace"
                wordBreak="break-word"
              >
                {detail.label}
              </Text>

              <Text
                mt="2px"
                fontSize="11px"
                color="rgba(255,255,255,0.45)"
                wordBreak="break-word"
              >
                {detail.message}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

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
      duration = DEFAULT_DURATION,
      persistent = false,
      details,
    }: AppToastOptions) => {
      return toast({
        title,
        description,
        status,
        duration: persistent ? null : duration,
        position: "bottom",
        containerStyle: {
          marginBottom: "44px",
          marginRight: "12px",
        },
        render: ({ onClose }) => (
          <AppToastContent
            title={title}
            description={description}
            status={status}
            details={details}
            onClose={onClose}
          />
        ),
      });
    },
    [toast],
  );
};

export default useAppToast;