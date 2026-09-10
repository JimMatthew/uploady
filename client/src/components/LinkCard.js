import { lazy, Suspense } from "react";

import {
  Box,
  Button,
  Flex,
  Icon,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  Portal,
  Spinner,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { FiCopy, FiDownload, FiHardDrive, FiLink2, FiX } from "react-icons/fi";
import { MdQrCode2 } from "react-icons/md";

const QRCode = lazy(() => import("react-qr-code"));

const ACCENT = "#818CF8";
const ACCENT_SOFT = "#A5B4FC";
const ERROR = "#E57373";

const LocationBadge = ({ label, remote = false }) => (
  <Flex
    align="center"
    gap="5px"
    px="7px"
    h="22px"
    borderRadius="6px"
    bg={remote ? "rgba(129,140,248,0.07)" : "rgba(255,255,255,0.04)"}
    border="1px solid"
    borderColor={remote ? "rgba(129,140,248,0.16)" : "rgba(255,255,255,0.075)"}
    flexShrink={0}
  >
    <Icon
      as={FiHardDrive}
      boxSize="9px"
      color={remote ? "rgba(165,180,252,0.8)" : "rgba(255,255,255,0.38)"}
    />

    <Text
      fontSize="10px"
      fontWeight={600}
      color={remote ? "rgba(165,180,252,0.8)" : "rgba(255,255,255,0.5)"}
      lineHeight={1}
    >
      {label}
    </Text>
  </Flex>
);

const IconAction = ({ icon, label, onClick, danger = false }) => (
  <Tooltip label={label} hasArrow openDelay={400}>
    <Button
      minW="28px"
      w="28px"
      h="28px"
      p={0}
      variant="ghost"
      borderRadius="7px"
      color={danger ? "rgba(229,115,115,0.48)" : "rgba(255,255,255,0.4)"}
      onClick={onClick}
      aria-label={label}
      _hover={{
        bg: danger ? "rgba(229,115,115,0.08)" : "rgba(255,255,255,0.055)",
        color: danger ? ERROR : "rgba(255,255,255,0.8)",
      }}
      _active={{
        bg: danger ? "rgba(229,115,115,0.11)" : "rgba(255,255,255,0.08)",
      }}
    >
      <Icon as={icon} boxSize="12px" />
    </Button>
  </Tooltip>
);

const QrCodeFallback = () => (
  <Flex w="160px" h="160px" align="center" justify="center">
    <Spinner size="sm" thickness="2px" color="gray.600" />
  </Flex>
);

const LinkCard = ({ linkItem, stopSharing, downloadLink, copyToClipboard }) => {
  const isRemote = Boolean(linkItem.isRemote);

  return (
    <Box
      bg="#1C212A"
      border="1px solid"
      borderColor="rgba(255,255,255,0.07)"
      borderRadius="11px"
      boxShadow="0 6px 20px rgba(0,0,0,0.1)"
    >
      <Box p={4}>
        <Flex align="center" justify="space-between" gap={3}>
          <Flex align="center" gap={2.5} minW={0} flex={1}>
            <Flex
              align="center"
              justify="center"
              w="30px"
              h="30px"
              flexShrink={0}
              borderRadius="8px"
              bg="rgba(99,102,241,0.075)"
              border="1px solid rgba(129,140,248,0.1)"
            >
              <Icon
                as={FiLink2}
                boxSize="13px"
                color="rgba(165,180,252,0.72)"
              />
            </Flex>

            <Text
              minW={0}
              fontSize="13px"
              fontWeight={600}
              color="rgba(255,255,255,0.88)"
              fontFamily="'JetBrains Mono', monospace"
              letterSpacing="-0.015em"
              noOfLines={1}
            >
              {linkItem.fileName}
            </Text>
          </Flex>

          <Flex align="center" gap={1} flexShrink={0}>
            <LocationBadge
              remote={isRemote}
              label={isRemote ? (linkItem.serverName ?? "Remote") : "Local"}
            />

            <IconAction
              icon={FiX}
              label="Stop sharing"
              danger
              onClick={() => stopSharing(linkItem.token)}
            />
          </Flex>
        </Flex>

        <Flex
          mt={3.5}
          align="center"
          gap={2}
          px={3}
          h="40px"
          bg="rgba(0,0,0,0.13)"
          border="1px solid"
          borderColor="rgba(255,255,255,0.06)"
          borderRadius="8px"
          transition="background 120ms ease, border-color 120ms ease"
          _hover={{
            bg: "rgba(0,0,0,0.16)",
            borderColor: "rgba(255,255,255,0.09)",
          }}
        >
          <Text
            flex={1}
            minW={0}
            fontSize="10.5px"
            fontFamily="'JetBrains Mono', monospace"
            color="rgba(255,255,255,0.55)"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {linkItem.link}
          </Text>

          <Tooltip label="Copy link" hasArrow openDelay={400}>
            <Button
              minW="27px"
              w="27px"
              h="27px"
              p={0}
              flexShrink={0}
              variant="ghost"
              borderRadius="6px"
              color="rgba(255,255,255,0.38)"
              onClick={() => copyToClipboard(linkItem.link)}
              aria-label="Copy shared link"
              _hover={{
                bg: "rgba(255,255,255,0.055)",
                color: ACCENT_SOFT,
              }}
            >
              <FiCopy size={12} />
            </Button>
          </Tooltip>
        </Flex>

        <Flex mt={3} align="center" gap={2}>
          <Button
            size="xs"
            h="29px"
            px={3}
            leftIcon={<Icon as={FiDownload} boxSize="11px" />}
            onClick={() => downloadLink(linkItem.link, linkItem.fileName)}
            borderRadius="7px"
            bg="rgba(99,102,241,0.09)"
            border="1px solid"
            borderColor="rgba(129,140,248,0.18)"
            color="rgba(165,180,252,0.82)"
            fontSize="11px"
            fontWeight={600}
            _hover={{
              bg: "rgba(99,102,241,0.14)",
              borderColor: "rgba(129,140,248,0.28)",
              color: ACCENT_SOFT,
            }}
            _active={{
              bg: "rgba(99,102,241,0.18)",
            }}
          >
            Download
          </Button>

          <Popover placement="top-start" isLazy>
            <PopoverTrigger>
              <Box>
                <Button
                  size="xs"
                  h="29px"
                  px={3}
                  leftIcon={<Icon as={MdQrCode2} boxSize="12px" />}
                  borderRadius="7px"
                  variant="ghost"
                  border="1px solid"
                  borderColor="rgba(255,255,255,0.07)"
                  color="rgba(255,255,255,0.46)"
                  fontSize="11px"
                  fontWeight={500}
                  _hover={{
                    bg: "rgba(255,255,255,0.045)",
                    borderColor: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.75)",
                  }}
                >
                  QR code
                </Button>
              </Box>
            </PopoverTrigger>

            <Portal>
              <PopoverContent
                w="224px"
                zIndex={1500}
                bg="#20242E"
                border="1px solid"
                borderColor="rgba(255,255,255,0.1)"
                borderRadius="12px"
                boxShadow="0 18px 50px rgba(0,0,0,0.4)"
              >
                <PopoverArrow bg="#20242E" />

                <PopoverCloseButton
                  mt={1}
                  mr={1}
                  color="rgba(255,255,255,0.45)"
                />

                <PopoverBody p={4}>
                  <Text
                    mb={3}
                    fontSize="11px"
                    fontWeight={600}
                    color="rgba(255,255,255,0.65)"
                  >
                    Scan to open link
                  </Text>

                  <Box
                    bg="white"
                    p={2.5}
                    borderRadius="9px"
                    boxShadow="0 4px 14px rgba(0,0,0,0.2)"
                  >
                    <Suspense fallback={<QrCodeFallback />}>
                      <QRCode
                        value={linkItem.link}
                        size={160}
                        level="H"
                        bgColor="#FFFFFF"
                        fgColor="#151821"
                        style={{
                          width: "100%",
                          height: "auto",
                        }}
                      />
                    </Suspense>
                  </Box>
                </PopoverBody>
              </PopoverContent>
            </Portal>
          </Popover>
        </Flex>
      </Box>
    </Box>
  );
};

export default LinkCard;
