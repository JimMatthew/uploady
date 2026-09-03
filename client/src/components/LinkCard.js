import {
  Box,
  Flex,
  Text,
  HStack,
  Icon,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  PopoverBody,
} from "@chakra-ui/react";
import {
  FiDownload,
  FiCopy,
  FiLink2,
  FiX,
  FiHardDrive,
} from "react-icons/fi";
import { MdQrCode2 } from "react-icons/md";
import QRCode from "react-qr-code";

const ActionButton = ({
  icon,
  label,
  onClick,
  accent,
}) => (
  <Flex
    align="center"
    gap="6px"
    px={3}
    h="28px"
    borderRadius="6px"
    cursor="pointer"
    fontSize="12px"
    fontWeight={500}
    border="1px solid"
    borderColor={
      accent
        ? `rgba(${accent},0.3)`
        : "rgba(255,255,255,0.08)"
    }
    color={
      accent
        ? `rgba(${accent},0.9)`
        : "rgba(255,255,255,0.45)"
    }
    bg={
      accent
        ? `rgba(${accent},0.08)`
        : "transparent"
    }
    transition="all 0.12s"
    _hover={{
      borderColor: accent
        ? `rgba(${accent},0.5)`
        : "rgba(255,255,255,0.2)",
      bg: accent
        ? `rgba(${accent},0.14)`
        : "rgba(255,255,255,0.05)",
      color: accent
        ? `rgba(${accent},1)`
        : "rgba(255,255,255,0.8)",
    }}
    onClick={onClick}
  >
    <Icon as={icon} boxSize="12px" />
    {label}
  </Flex>
);

const LocationBadge = ({
  label,
  color,
  background,
  border,
}) => (
  <Flex
    display="inline-flex"
    align="center"
    gap={1}
    px="7px"
    h="19px"
    borderRadius="4px"
    bg={background}
    border={`1px solid ${border}`}
  >
    <Icon
      as={FiHardDrive}
      boxSize="9px"
      color={color}
    />

    <Text
      fontSize="10px"
      color={color}
      fontWeight={600}
      letterSpacing="0.04em"
    >
      {label}
    </Text>
  </Flex>
);

const LinkCard = ({
  linkItem,
  stopSharing,
  downloadLink,
  copyToClipboard,
}) => {
  const locationBadge = linkItem.isRemote ? (
    <LocationBadge
      label={linkItem.serverName ?? "Remote"}
      color="#A78BFA"
      background="rgba(139,92,246,0.1)"
      border="rgba(139,92,246,0.22)"
    />
  ) : (
    <LocationBadge
      label="Local"
      color="rgba(34,197,94,0.8)"
      background="rgba(34,197,94,0.08)"
      border="rgba(34,197,94,0.18)"
    />
  );

  return (
    <Box
      p={4}
      bg="rgba(255,255,255,0.02)"
      border="1px solid rgba(255,255,255,0.07)"
      borderRadius="12px"
      transition="all 0.15s"
      position="relative"
      _hover={{
        borderColor: "rgba(255,255,255,0.13)",
        bg: "rgba(255,255,255,0.03)",
      }}
    >
      <Flex
        position="absolute"
        top={3}
        right={3}
        w="22px"
        h="22px"
        align="center"
        justify="center"
        borderRadius="5px"
        cursor="pointer"
        color="rgba(255,255,255,0.15)"
        transition="all 0.12s"
        _hover={{
          bg: "rgba(239,68,68,0.12)",
          color: "#EF4444",
        }}
        onClick={() => stopSharing(linkItem.token)}
      >
        <FiX size={12} />
      </Flex>

      <HStack
        spacing={2}
        minW={0}
        mb={1}
        pr={6}
      >
        <Icon
          as={FiLink2}
          boxSize="13px"
          color="rgba(99,102,241,0.6)"
          flexShrink={0}
        />

        <Text
          fontSize="13px"
          fontWeight={600}
          color="rgba(255,255,255,0.85)"
          fontFamily="'JetBrains Mono', monospace"
          noOfLines={1}
          letterSpacing="-0.01em"
        >
          {linkItem.fileName}
        </Text>
      </HStack>

      <Text
        fontSize="11px"
        fontFamily="'JetBrains Mono', monospace"
        color="rgba(255,255,255,0.2)"
        noOfLines={1}
        mb={3}
        pl="21px"
      >
        {linkItem.link}
      </Text>

      <HStack spacing={2} mb={3}>
        {locationBadge}
      </HStack>

      <HStack
        spacing={2}
        flexWrap="wrap"
      >
        <ActionButton
          icon={FiDownload}
          label="Download"
          accent="99,102,241"
          onClick={() =>
            downloadLink(
              linkItem.link,
              linkItem.fileName,
            )
          }
        />

        <ActionButton
          icon={FiCopy}
          label="Copy"
          onClick={() =>
            copyToClipboard(linkItem.link)
          }
        />

        <Popover placement="top">
          <PopoverTrigger>
            <Box>
              <ActionButton
                icon={MdQrCode2}
                label="QR"
              />
            </Box>
          </PopoverTrigger>

          <PopoverContent
            w="200px"
            bg="rgba(15,15,20,0.98)"
            border="1px solid rgba(255,255,255,0.1)"
            borderRadius="12px"
            boxShadow="0 8px 32px rgba(0,0,0,0.6)"
          >
            <PopoverArrow bg="rgba(15,15,20,0.98)" />

            <PopoverCloseButton
              size="sm"
              color="rgba(255,255,255,0.4)"
            />

            <PopoverBody p={4}>
              <Box
                bg="white"
                p={2}
                borderRadius="8px"
              >
                <QRCode
                  value={linkItem.link}
                  size={160}
                  level="H"
                  bgColor="white"
                  fgColor="#0D0D12"
                  style={{
                    width: "100%",
                    height: "auto",
                  }}
                />
              </Box>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </HStack>
    </Box>
  );
};

export default LinkCard;