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
  Text,
  Tooltip,
} from "@chakra-ui/react";

import { FiCopy, FiDownload, FiHardDrive, FiLink2, FiX } from "react-icons/fi";

import { MdQrCode2 } from "react-icons/md";

import QRCode from "react-qr-code";

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
    bg={remote ? "rgba(129,140,248,0.08)" : "rgba(255,255,255,0.045)"}
    border="1px solid"
    borderColor={remote ? "rgba(129,140,248,0.18)" : "rgba(255,255,255,0.08)"}
    flexShrink={0}
  >
    <Icon
      as={FiHardDrive}
      boxSize="9px"
      color={remote ? ACCENT_SOFT : "rgba(255,255,255,0.4)"}
    />

    <Text
      fontSize="10px"
      fontWeight={600}
      color={remote ? ACCENT_SOFT : "rgba(255,255,255,0.52)"}
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
      color={danger ? "rgba(229,115,115,0.55)" : "rgba(255,255,255,0.42)"}
      onClick={onClick}
      aria-label={label}
      _hover={{
        bg: danger ? "rgba(229,115,115,0.09)" : "rgba(255,255,255,0.06)",
        color: danger ? ERROR : "rgba(255,255,255,0.85)",
      }}
      _active={{
        bg: danger ? "rgba(229,115,115,0.13)" : "rgba(255,255,255,0.09)",
      }}
    >
      <Icon as={icon} boxSize="12px" />
    </Button>
  </Tooltip>
);

const LinkCard = ({ linkItem, stopSharing, downloadLink, copyToClipboard }) => {
  const isRemote = Boolean(linkItem.isRemote);

  return (
    <Box
      position="relative"
      bg="#1A1E27"
      border="1px solid"
      borderColor="rgba(255,255,255,0.075)"
      borderRadius="12px"
      boxShadow="0 8px 24px rgba(0,0,0,0.12)"
      transition="
        background 140ms ease,
        border-color 140ms ease,
        transform 140ms ease,
        box-shadow 140ms ease
      "
      _hover={{
        bg: "#1C202A",
        borderColor: "rgba(255,255,255,0.13)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
        transform: "translateY(-1px)",
      }}
    >
      {/* Very subtle accent line */}
      <Box
        position="absolute"
        top={0}
        left="18px"
        right="18px"
        h="1px"
        bg="linear-gradient(90deg, transparent, rgba(129,140,248,0.35), transparent)"
        pointerEvents="none"
      />

      <Box p={4}>
        {/* Header */}
        <Flex align="center" justify="space-between" gap={3}>
          <Flex align="center" gap={2.5} minW={0} flex={1}>
            <Flex
              align="center"
              justify="center"
              w="30px"
              h="30px"
              flexShrink={0}
              borderRadius="8px"
              bg="rgba(99,102,241,0.1)"
              border="1px solid rgba(129,140,248,0.12)"
            >
              <Icon as={FiLink2} boxSize="13px" color={ACCENT} />
            </Flex>

            <Text
              minW={0}
              fontSize="13px"
              fontWeight={600}
              color="rgba(255,255,255,0.9)"
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

        {/* Link section */}
        <Box mt={4}>
          <Text
            mb="6px"
            fontSize="10px"
            fontWeight={600}
            color="rgba(255,255,255,0.35)"
            letterSpacing="0.06em"
            textTransform="uppercase"
          >
            Shared link
          </Text>

          <Flex
            align="flex-start"
            gap={2}
            px={3}
            py={2.5}
            minH="42px"
            bg="rgba(0,0,0,0.16)"
            border="1px solid"
            borderColor="rgba(255,255,255,0.075)"
            borderRadius="8px"
            transition="border-color 120ms ease, background 120ms ease"
            _hover={{
              bg: "rgba(0,0,0,0.2)",
              borderColor: "rgba(129,140,248,0.2)",
            }}
          >
            <Text
              flex={1}
              minW={0}
              fontSize="11px"
              lineHeight="1.55"
              fontFamily="'JetBrains Mono', monospace"
              color="rgba(255,255,255,0.72)"
              overflowWrap="anywhere"
              wordBreak="break-word"
            >
              {linkItem.link}
            </Text>

            <Tooltip label="Copy link" hasArrow openDelay={400}>
              <Button
                minW="28px"
                w="28px"
                h="28px"
                p={0}
                mt="-3px"
                mr="-3px"
                flexShrink={0}
                variant="ghost"
                borderRadius="6px"
                color="rgba(255,255,255,0.42)"
                onClick={() => copyToClipboard(linkItem.link)}
                aria-label="Copy shared link"
                _hover={{
                  bg: "rgba(99,102,241,0.1)",
                  color: ACCENT_SOFT,
                }}
              >
                <FiCopy size={12} />
              </Button>
            </Tooltip>
          </Flex>
        </Box>

        {/* Footer actions */}
        <Flex
          mt={4}
          pt={3}
          align="center"
          justify="space-between"
          borderTop="1px solid rgba(255,255,255,0.055)"
        >
          <Button
            size="xs"
            h="30px"
            px={3}
            leftIcon={<Icon as={FiDownload} boxSize="11px" />}
            onClick={() => downloadLink(linkItem.link, linkItem.fileName)}
            borderRadius="7px"
            bg="rgba(99,102,241,0.12)"
            border="1px solid"
            borderColor="rgba(129,140,248,0.25)"
            color={ACCENT_SOFT}
            fontSize="11px"
            fontWeight={600}
            _hover={{
              bg: "rgba(99,102,241,0.2)",
              borderColor: "rgba(129,140,248,0.42)",
              color: "#C7D2FE",
            }}
            _active={{
              bg: "rgba(99,102,241,0.26)",
            }}
          >
            Download
          </Button>

          <Popover placement="top-end">
            <PopoverTrigger>
              <Box>
                <Button
                  size="xs"
                  h="30px"
                  px={3}
                  leftIcon={<Icon as={MdQrCode2} boxSize="12px" />}
                  borderRadius="7px"
                  variant="ghost"
                  border="1px solid"
                  borderColor="rgba(255,255,255,0.08)"
                  color="rgba(255,255,255,0.52)"
                  fontSize="11px"
                  fontWeight={500}
                  _hover={{
                    bg: "rgba(255,255,255,0.05)",
                    borderColor: "rgba(255,255,255,0.16)",
                    color: "rgba(255,255,255,0.85)",
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
