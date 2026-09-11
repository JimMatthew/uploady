import { useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";

interface AudioViewerProps {
  src: string;
  filename: string;
}

export default function AudioViewer({ src, filename }: AudioViewerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = async (): Promise<void> => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    try {
      await audio.play();
      setPlaying(true);
    } catch (error: unknown) {
      console.error("Failed to play audio:", error);
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || !Number.isFinite(seconds)) {
      return "0:00";
    }

    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleSeek = (event: MouseEvent<HTMLDivElement>): void => {
    const audio = audioRef.current;

    if (!audio || !duration) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    const percent = (event.clientX - rect.left) / rect.width;

    audio.currentTime = percent * duration;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      h="100%"
      gap={6}
      px={8}
    >
      <Box
        w="120px"
        h="120px"
        borderRadius="16px"
        bg="rgba(99,102,241,0.08)"
        border="1px solid rgba(99,102,241,0.2)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        boxShadow="0 8px 32px rgba(0,0,0,0.3)"
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="rgba(99,102,241,0.4)"
            strokeWidth="1.5"
          />

          <circle cx="12" cy="12" r="3" fill="#6366F1" fillOpacity="0.6" />

          <circle cx="12" cy="12" r="1" fill="#818CF8" />
        </svg>
      </Box>

      <Text
        fontSize="13px"
        fontWeight={600}
        fontFamily="'JetBrains Mono', monospace"
        color="rgba(255,255,255,0.7)"
        noOfLines={1}
        maxW="320px"
      >
        {filename}
      </Text>

      <Box w="100%" maxW="360px">
        <Box
          w="100%"
          h="3px"
          bg="rgba(255,255,255,0.07)"
          borderRadius="full"
          cursor="pointer"
          onClick={handleSeek}
        >
          <Box
            h="100%"
            borderRadius="full"
            bg="linear-gradient(90deg, #6366F1, #818CF8)"
            w={`${progress}%`}
            transition="width 0.1s linear"
          />
        </Box>

        <Flex justify="space-between" mt="6px">
          <Text
            fontSize="10px"
            color="rgba(255,255,255,0.25)"
            fontFamily="'JetBrains Mono', monospace"
          >
            {formatTime(currentTime)}
          </Text>

          <Text
            fontSize="10px"
            color="rgba(255,255,255,0.25)"
            fontFamily="'JetBrains Mono', monospace"
          >
            {formatTime(duration)}
          </Text>
        </Flex>
      </Box>

      <Flex
        w="44px"
        h="44px"
        align="center"
        justify="center"
        borderRadius="full"
        bg={playing ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.06)"}
        border="1px solid"
        borderColor={playing ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.1)"}
        cursor="pointer"
        onClick={() => {
          void toggle();
        }}
      >
        {playing ? (
          <Flex gap="3px">
            <Box w="3px" h="14px" borderRadius="2px" bg="#818CF8" />

            <Box w="3px" h="14px" borderRadius="2px" bg="#818CF8" />
          </Flex>
        ) : (
          <Box
            borderStyle="solid"
            borderColor="transparent transparent transparent rgba(255,255,255,0.7)"
            borderWidth="7px 0 7px 12px"
            ml="2px"
          />
        )}
      </Flex>

      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        style={{
          display: "none",
        }}
      />
    </Flex>
  );
}
