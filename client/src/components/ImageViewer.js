import { Center, Image, useColorModeValue } from "@chakra-ui/react";

const ImageViewer = ({ src, alt }) => {
  return (
    <Center h="100%" bg={useColorModeValue("gray.50", "gray.800")}>
      <Image
        src={src}
        alt={alt}
        maxW="90%"
        maxH="90%"
        style={{
          maxWidth: "95%",
          maxHeight: "95%",
          objectFit: "scale-down", 
          borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
        }}
        objectFit="contain"
      />
    </Center>
  );
};

export default ImageViewer;