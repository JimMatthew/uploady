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
} from "@chakra-ui/react";
import QRCode from "react-qr-code";
const LinkCard = ({ linkItem, stopSharing, clickLink, copyToClipboard }) => {
  return (
    <Box
      p={4}
      shadow="md"
      borderWidth="1px"
      borderRadius="lg"
      background="gray.50"
      transition="0.3s ease"
      _hover={{ shadow: "lg", background: "gray.100" }}
    >
      <Flex justify="space-between" align="center" mb={3}>
        <Heading size="sm" isTruncated maxW="200px">
          {linkItem.fileName}
        </Heading>
        <Button
          size="xs"
          colorScheme="red"
          onClick={() => stopSharing(linkItem.token)}
        >
          Stop Sharing
        </Button>
      </Flex>

      <Text fontSize="sm" color="gray.600" mb={2} noOfLines={2}>
        {linkItem.link}
      </Text>

      <Flex justify="space-between" align="center">
        <Button
          size="sm"
          colorScheme="blue"
          variant="outline"
          onClick={() => clickLink(linkItem.link, linkItem.fileName)}
        >
          Download
        </Button>
        <Button size="sm" colorScheme="green" onClick={() => copyToClipboard(linkItem.link)}>
          Copy Link
        </Button>
        <Popover>
          <PopoverTrigger>
            <Button size="sm" colorScheme="teal">
              QR Code
            </Button>
          </PopoverTrigger>
          <PopoverContent
            borderRadius="lg"
            shadow="xl"
            maxW={{ base: "90vw", md: "350px" }}
            _focus={{ outline: "none" }}
          >
            <PopoverArrow />
            <PopoverCloseButton />

            <PopoverHeader
              display="flex"
              alignItems="center"
              justifyContent="center"
              bg="teal.500"
              color="white"
              fontWeight="bold"
              borderRadius="lg"
              textAlign="center"
              px={4}
              py={2}
            >
              <Box as="span" mr={2}>
                📲
              </Box>
              Scan QR Code
            </PopoverHeader>

            {/* Body with QR code */}
            <PopoverBody
              display="flex"
              alignItems="center"
              justifyContent="center"
              p={6}
              bg="gray.50"
              borderRadius="lg"
              _hover={{ bg: "gray.100" }}
              transition="background-color 0.3s"
            >
              <QRCode
                value={linkItem.link}
                size={150}
                level="H"
                bgColor="white"
                fgColor="black"
                style={{ width: "100%", height: "auto", maxWidth: "200px" }}
              />
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </Flex>
    </Box>
  );
};

export default LinkCard;
