import { Box } from "@chakra-ui/react";

interface VideoViewerProps {
  src: string;
}

export default function VideoViewer({ src }: VideoViewerProps) {
  return (
    <Box bg="#000" borderRadius="8px" overflow="hidden">
      <video
        controls
        src={src}
        style={{
          width: "100%",
          display: "block",
        }}
      >
        Video not supported
      </video>
    </Box>
  );
}
