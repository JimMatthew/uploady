import {
  Card,
  CardHeader,
  CardBody,
  Flex,
  Heading,
  Text,
  Button,
  Badge,
  useColorModeValue,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  PopoverHeader,
  PopoverBody,
  Spacer,
} from "@chakra-ui/react";
import QRCode from "react-qr-code";
const LinkCard = ({ linkItem, stopSharing, clickLink, copyToClipboard }) => {
  const bgg = useColorModeValue("white", "gray.800");
  const hvr = useColorModeValue("gray.100", "gray.750");
  return (
    <Card
      borderRadius="xl"
      shadow="md"
      borderWidth="1px"
      bg={useColorModeValue("white", "gray.800")}
      transition="all 0.2s ease"
      
    >
      <CardHeader pb={2}>
        <Flex align="center">
          <Heading size="sm" noOfLines={1}>
            {linkItem.fileName}
          </Heading>
          <Spacer />
          <Button
            size="xs"
            colorScheme="red"
            variant="ghost"
            onClick={() => stopSharing(linkItem.token)}
          >
            Stop
          </Button>
        </Flex>
      </CardHeader>

      <CardBody pt={0}>
        {/* Link */}
        <Text
          fontSize="sm"
          color={useColorModeValue("gray.600", "gray.400")}
          noOfLines={2}
          mb={2}
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
        <Flex gap={2} wrap="wrap">
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
              borderRadius="lg"
              shadow="lg"
              maxW={{ base: "90vw", md: "300px" }}
            >
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverHeader
                fontWeight="semibold"
                bg="teal.500"
                color="white"
                textAlign="center"
                borderTopRadius="lg"
              >
                Scan QR Code
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
      </CardBody>
    </Card>
  );
};

export default LinkCard;
