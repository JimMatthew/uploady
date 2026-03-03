import { Box, Flex, Text, HStack, Icon, Popover, PopoverTrigger, PopoverContent, PopoverArrow, PopoverCloseButton, PopoverBody } from "@chakra-ui/react";
import { FiDownload, FiCopy, FiLink2, FiX } from "react-icons/fi";
import { MdQrCode2 } from "react-icons/md";
import QRCode from "react-qr-code";

const ActionBtn = ({ icon, label, onClick, accent }) => (
  <Flex
    align="center" gap="6px"
    px={3} h="28px"
    borderRadius="6px"
    cursor="pointer"
    fontSize="12px"
    fontWeight={500}
    border="1px solid"
    borderColor={accent ? `rgba(${accent},0.3)` : "rgba(255,255,255,0.08)"}
    color={accent ? `rgba(${accent},0.9)` : "rgba(255,255,255,0.45)"}
    bg={accent ? `rgba(${accent},0.08)` : "transparent"}
    transition="all 0.12s"
    _hover={{
      borderColor: accent ? `rgba(${accent},0.5)` : "rgba(255,255,255,0.2)",
      bg: accent ? `rgba(${accent},0.14)` : "rgba(255,255,255,0.05)",
      color: accent ? `rgba(${accent},1)` : "rgba(255,255,255,0.8)",
    }}
    onClick={onClick}
  >
    <Icon as={icon} boxSize="12px" />
    {label}
  </Flex>
);

const LinkCard = ({ linkItem, stopSharing, clickLink, copyToClipboard }) => (
  <Box
    p={4}
    bg="rgba(255,255,255,0.02)"
    border="1px solid rgba(255,255,255,0.07)"
    borderRadius="10px"
    transition="border-color 0.12s"
    _hover={{ borderColor: "rgba(255,255,255,0.12)" }}
  >
    {/* Header */}
    <Flex align="start" justify="space-between" mb={3}>
      <HStack spacing={2} minW={0} flex={1}>
        <Icon as={FiLink2} boxSize="13px" color="rgba(255,255,255,0.3)" flexShrink={0} />
        <Text
          fontSize="13px" fontWeight={600}
          color="rgba(255,255,255,0.8)"
          fontFamily="'JetBrains Mono', monospace"
          noOfLines={1}
          letterSpacing="-0.01em"
        >
          {linkItem.fileName}
        </Text>
      </HStack>
      <Flex
        w="22px" h="22px" flexShrink={0}
        align="center" justify="center"
        borderRadius="5px"
        cursor="pointer"
        color="rgba(255,255,255,0.2)"
        transition="all 0.12s"
        _hover={{ bg: "rgba(239,68,68,0.12)", color: "#EF4444" }}
        onClick={() => stopSharing(linkItem.token)}
      >
        <FiX size={12} />
      </Flex>
    </Flex>

    {/* URL */}
    <Text
      fontSize="11px"
      fontFamily="'JetBrains Mono', monospace"
      color="rgba(255,255,255,0.25)"
      noOfLines={1}
      mb={2}
    >
      {linkItem.link}
    </Text>

    {/* Remote badge */}
    {linkItem.isRemote && (
      <Flex
        display="inline-flex"
        align="center"
        gap={1}
        px="6px" h="18px"
        borderRadius="4px"
        bg="rgba(139,92,246,0.12)"
        border="1px solid rgba(139,92,246,0.25)"
        mb={3}
      >
        <Text fontSize="10px" color="#A78BFA" fontWeight={600} letterSpacing="0.04em">
          REMOTE · {linkItem.serverName}
        </Text>
      </Flex>
    )}

    {/* Actions */}
    <HStack spacing={2} flexWrap="wrap">
      <ActionBtn icon={FiDownload} label="Download" accent="99,102,241"
        onClick={() => clickLink(linkItem.link, linkItem.fileName)} />
      <ActionBtn icon={FiCopy} label="Copy"
        onClick={() => copyToClipboard(linkItem.link)} />
      <Popover placement="top">
        <PopoverTrigger>
          <Box>
            <ActionBtn icon={MdQrCode2} label="QR" />
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
          <PopoverCloseButton size="sm" color="rgba(255,255,255,0.4)" />
          <PopoverBody p={4}>
            <Box bg="white" p={2} borderRadius="8px">
              <QRCode value={linkItem.link} size={160} level="H" bgColor="white" fgColor="#0D0D12" style={{ width: "100%", height: "auto" }} />
            </Box>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </HStack>
  </Box>
);

export default LinkCard;