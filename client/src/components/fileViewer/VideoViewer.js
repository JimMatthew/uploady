import { Box } from "@chakra-ui/react";

export default function VideoViewer({ src }) {
  return (
    <Box bg="#000" borderRadius="8px" overflow="hidden">
      <video
        controls
        style={{
          width: "100%",
          display: "block",
        }}
        src={src}
      >
        Video not supported
      </video>
    </Box>
  );
}
