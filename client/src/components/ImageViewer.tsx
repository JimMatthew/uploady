import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import {
  Box,
  Flex,
  Text,
  Icon,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from "@chakra-ui/react";

import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";

import type { IconType } from "react-icons";
import {
  FiZoomIn,
  FiZoomOut,
  FiRotateCw,
  FiRotateCcw,
  FiCrop,
  FiX,
  FiCheck,
  FiDownload,
  FiMaximize2,
} from "react-icons/fi";

interface ImageViewerProps {
  src: string;
  alt?: string;
  onSave?: (blob: Blob) => void | Promise<void>;
}

interface ToolBtnProps {
  icon: IconType;
  label: string;
  onClick: () => void | Promise<void>;
  active?: boolean;
  disabled?: boolean;
}

const getCroppedImg = async (
  imageSrc: string,
  croppedAreaPixels: Area,
  rotation: number,
): Promise<Blob> => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();

    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);

    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to create canvas context");
  }

  const maxSize = Math.max(image.width, image.height);

  canvas.width = maxSize;
  canvas.height = maxSize;

  ctx.translate(maxSize / 2, maxSize / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-maxSize / 2, -maxSize / 2);

  ctx.drawImage(
    image,
    (maxSize - image.width) / 2,
    (maxSize - image.height) / 2,
  );

  const data = ctx.getImageData(
    croppedAreaPixels.x + (maxSize - image.width) / 2,
    croppedAreaPixels.y + (maxSize - image.height) / 2,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
  );

  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;

  ctx.putImageData(data, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Unable to create cropped image"));
        }
      },
      "image/jpeg",
      0.95,
    );
  });
};

const ToolBtn = ({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
}: ToolBtnProps) => (
  <Flex
    direction="column"
    align="center"
    gap={1}
    px={3}
    py={2}
    borderRadius="8px"
    cursor={disabled ? "not-allowed" : "pointer"}
    bg={active ? "rgba(99,102,241,0.2)" : "transparent"}
    border="1px solid"
    borderColor={active ? "rgba(99,102,241,0.4)" : "transparent"}
    color={
      active
        ? "#818CF8"
        : disabled
          ? "rgba(255,255,255,0.15)"
          : "rgba(255,255,255,0.5)"
    }
    transition="all 0.12s"
    opacity={disabled ? 0.5 : 1}
    _hover={
      !disabled
        ? {
            bg: active ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.06)",
            color: active ? "#818CF8" : "rgba(255,255,255,0.9)",
          }
        : {}
    }
    onClick={disabled ? undefined : () => void onClick()}
    minW="52px"
  >
    <Icon as={icon} boxSize="16px" />

    <Text fontSize="10px" letterSpacing="0.03em" fontWeight={500}>
      {label}
    </Text>
  </Flex>
);

const ImageViewer = ({ src, alt = "", onSave }: ImageViewerProps) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [croppedSrc, setCroppedSrc] = useState<string | null>(null);

  const displaySrc = croppedSrc ?? src;

  const onCropComplete = useCallback(
    (_croppedArea: Area, pixels: Area): void => {
      setCroppedAreaPixels(pixels);
    },
    [],
  );

  const applyCrop = async (): Promise<void> => {
    if (!croppedAreaPixels) {
      return;
    }

    try {
      const blob = await getCroppedImg(displaySrc, croppedAreaPixels, 0);

      const url = URL.createObjectURL(blob);

      setCroppedSrc((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return url;
      });

      setIsCropping(false);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setRotation(0);

      if (onSave) {
        await onSave(blob);
      }
    } catch (error: unknown) {
      console.error(error);
    }
  };

  const cancelCrop = (): void => {
    setIsCropping(false);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  const rotate = (degrees: number): void => {
    setRotation((current) => (current + degrees + 360) % 360);
  };

  const handleDownload = (): void => {
    const anchor = document.createElement("a");

    anchor.href = displaySrc;
    anchor.download = alt || "image";
    anchor.click();
  };

  const reset = (): void => {
    if (croppedSrc) {
      URL.revokeObjectURL(croppedSrc);
    }

    setCroppedSrc(null);
    setZoom(1);
    setRotation(0);
    setCrop({ x: 0, y: 0 });
    setIsCropping(false);
    setCroppedAreaPixels(null);
  };

  return (
    <Box h="100%" display="flex" flexDirection="column" bg="#0A0A0E">
      {/* Toolbar */}
      <Flex
        align="center"
        justify="center"
        gap={1}
        px={4}
        py={2}
        borderBottom="1px solid rgba(255,255,255,0.07)"
        flexWrap="wrap"
        flexShrink={0}
        bg="gray.800"
      >
        {isCropping ? (
          <>
            <Text
              fontSize="11px"
              color="rgba(255,255,255,0.3)"
              mr={2}
              letterSpacing="0.05em"
            >
              CROP MODE
            </Text>

            <Flex align="center" gap={2} mx={3}>
              <Icon
                as={FiZoomOut}
                boxSize="13px"
                color="rgba(255,255,255,0.4)"
              />

              <Slider
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={setZoom}
                w="100px"
              >
                <SliderTrack bg="rgba(255,255,255,0.1)" h="2px">
                  <SliderFilledTrack bg="#6366F1" />
                </SliderTrack>

                <SliderThumb
                  boxSize="12px"
                  bg="#818CF8"
                  _focus={{
                    boxShadow: "0 0 0 3px rgba(99,102,241,0.3)",
                  }}
                />
              </Slider>

              <Icon
                as={FiZoomIn}
                boxSize="13px"
                color="rgba(255,255,255,0.4)"
              />
            </Flex>

            <Box flex={1} />

            <ToolBtn icon={FiX} label="Cancel" onClick={cancelCrop} />

            <ToolBtn
              icon={FiCheck}
              label="Apply"
              onClick={applyCrop}
              active
              disabled={!croppedAreaPixels}
            />
          </>
        ) : (
          <>
            <ToolBtn
              icon={FiRotateCcw}
              label="Left"
              onClick={() => rotate(-90)}
            />

            <ToolBtn
              icon={FiRotateCw}
              label="Right"
              onClick={() => rotate(90)}
            />

            <Box w="1px" h="32px" bg="rgba(255,255,255,0.07)" mx={1} />

            <ToolBtn
              icon={FiZoomOut}
              label="Zoom out"
              onClick={() =>
                setZoom((current) => Math.max(0.5, current - 0.25))
              }
              disabled={zoom <= 0.5}
            />

            <Flex align="center" gap={2} mx={2}>
              <Slider
                min={0.5}
                max={4}
                step={0.05}
                value={zoom}
                onChange={setZoom}
                w="80px"
              >
                <SliderTrack bg="rgba(255,255,255,0.1)" h="2px">
                  <SliderFilledTrack bg="#6366F1" />
                </SliderTrack>

                <SliderThumb
                  boxSize="12px"
                  bg="#818CF8"
                  _focus={{
                    boxShadow: "0 0 0 3px rgba(99,102,241,0.3)",
                  }}
                />
              </Slider>
            </Flex>

            <ToolBtn
              icon={FiZoomIn}
              label="Zoom in"
              onClick={() => setZoom((current) => Math.min(4, current + 0.25))}
              disabled={zoom >= 4}
            />

            <Box w="1px" h="32px" bg="rgba(255,255,255,0.07)" mx={1} />

            <ToolBtn
              icon={FiCrop}
              label="Crop"
              onClick={() => setIsCropping(true)}
            />

            <ToolBtn
              icon={FiDownload}
              label="Download"
              onClick={handleDownload}
            />

            {croppedSrc && (
              <>
                <Box w="1px" h="32px" bg="rgba(255,255,255,0.07)" mx={1} />

                <ToolBtn icon={FiMaximize2} label="Reset" onClick={reset} />
              </>
            )}
          </>
        )}
      </Flex>

      {/* Image area */}
      <Box flex={1} position="relative" overflow="hidden" bg="gray.800">
        {isCropping ? (
          <Box position="relative" w="100%" h="calc(100vh - 200px)">
            <Cropper
              image={displaySrc}
              crop={crop}
              zoom={zoom}
              rotation={0}
              aspect={undefined}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{
                cropAreaStyle: {
                  border: "2px solid #6366F1",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.7)",
                },
              }}
            />
          </Box>
        ) : (
          <Flex h="100%" align="center" justify="center" overflow="hidden">
            <img
              src={displaySrc}
              alt={alt}
              style={{
                maxWidth: "95%",
                maxHeight: "95%",
                objectFit: "contain",
                borderRadius: "8px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                transform: `rotate(${rotation}deg) scale(${zoom})`,
                transition: "transform 0.2s ease",
                transformOrigin: "center center",
              }}
            />
          </Flex>
        )}
      </Box>

      {/* Status bar */}
      <Flex
        align="center"
        justify="space-between"
        px={4}
        h="28px"
        borderTop="1px solid rgba(255,255,255,0.05)"
        flexShrink={0}
        bg="gray.800"
      >
        <Text
          fontSize="11px"
          color="rgba(255,255,255,0.25)"
          fontFamily="'JetBrains Mono', monospace"
          noOfLines={1}
        >
          {alt}
        </Text>

        <Flex align="center" gap={3}>
          {croppedSrc && (
            <Text
              fontSize="10px"
              color="#4ADE80"
              fontWeight={600}
              letterSpacing="0.04em"
            >
              CROPPED
            </Text>
          )}

          <Text
            fontSize="11px"
            color="rgba(255,255,255,0.25)"
            fontFamily="'JetBrains Mono', monospace"
          >
            {Math.round(zoom * 100)}% · {rotation}°
          </Text>
        </Flex>
      </Flex>
    </Box>
  );
};

export default ImageViewer;
