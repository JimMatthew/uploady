import {
  Button,
  Box,
  Text,
  Flex,
  Heading,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  PopoverHeader,
  PopoverBody,
  useColorModeValue,
  Badge,
} from "@chakra-ui/react";
import QRCode from "react-qr-code";
const LinkCard = ({ linkItem, stopSharing, clickLink, copyToClipboard }) => {
  const bgg = useColorModeValue("white", "gray.800");
  const hvr = useColorModeValue("gray.100", "gray.750");
  return (
    <Box
      p={4}
      shadow="md"
      borderWidth="1px"
      borderRadius="lg"
      background={bgg}
      transition="0.3s ease"
      _hover={{ shadow: "lg", background: hvr }}
    >
      {/* Header */}
      <Flex justify="space-between" align="center" mb={3}>
        <Heading size="sm" isTruncated maxW="200px">
          {linkItem.fileName}
        </Heading>
        <Button
          size="xs"
          colorScheme="red"
          variant="ghost"
          onClick={() => stopSharing(linkItem.token)}
        >
          Stop
        </Button>
      </Flex>

      {/* Link */}
      <Text
        fontSize="sm"
        color={useColorModeValue("gray.600", "gray.400")}
        mb={2}
        noOfLines={2}
      >
        {linkItem.link}
      </Text>

      {/* Remote server info */}
      {linkItem.isRemote && (
        <Badge colorScheme="purple" mb={3}>
          Remote: {linkItem.serverName}
        </Badge>
      )}

      {/* Actions */}
      <Flex justify="space-between" align="center" mt={2} gap={2}>
        <Button
          size="sm"
          colorScheme="blue"
          onClick={() => clickLink(linkItem.link, linkItem.fileName)}
        >
          Download
        </Button>
        <Button
          size="sm"
          variant="outline"
          colorScheme="green"
          onClick={() => copyToClipboard(linkItem.link)}
        >
          Copy
        </Button>
        <Popover>
          <PopoverTrigger>
            <Button size="sm" variant="outline" colorScheme="teal">
              QR
            </Button>
          </PopoverTrigger>
          <PopoverContent
            borderRadius="md"
            shadow="lg"
            maxW={{ base: "90vw", md: "300px" }}
          >
            <PopoverArrow />
            <PopoverCloseButton />
            <PopoverHeader
              fontWeight="bold"
              bg="teal.500"
              color="white"
              textAlign="center"
            >
              📲 Scan QR Code
            </PopoverHeader>
            <PopoverBody display="flex" justifyContent="center" p={6}>
              <QRCode
                value={linkItem.link}
                size={160}
                level="H"
                bgColor="white"
                fgColor="black"
                style={{ width: "100%", height: "auto" }}
              />
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </Flex>
    </Box>
  );
};

export default LinkCard;
