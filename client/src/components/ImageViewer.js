import { useState, useCallback } from "react";
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

// Utility to get the cropped image as a blob
const getCroppedImg = async (imageSrc, croppedAreaPixels, rotation) => {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

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

  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
};

const ToolBtn = ({ icon, label, onClick, active, disabled }) => (
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
    onClick={!disabled ? onClick : undefined}
    minW="52px"
  >
    <Icon as={icon} boxSize="16px" />
    <Text fontSize="10px" letterSpacing="0.03em" fontWeight={500}>
      {label}
    </Text>
  </Flex>
);

const ImageViewer = ({ src, alt, onSave }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [croppedSrc, setCroppedSrc] = useState(null);

  const displaySrc = croppedSrc || src;

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const applyCrop = async () => {
    try {
      const blob = await getCroppedImg(displaySrc, croppedAreaPixels, 0);
      const url = URL.createObjectURL(blob);
      setCroppedSrc(url);
      setIsCropping(false);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setRotation(0);
    } catch (e) {
      console.error(e);
    }
  };

  const cancelCrop = () => {
    setIsCropping(false);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  const rotate = (deg) => setRotation((r) => (r + deg + 360) % 360);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = displaySrc;
    a.download = alt || "image";
    a.click();
  };

  const reset = () => {
    setCroppedSrc(null);
    setZoom(1);
    setRotation(0);
    setCrop({ x: 0, y: 0 });
    setIsCropping(false);
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
        bg="rgba(8,8,12,0.9)"
        flexWrap="wrap"
        flexShrink={0}
      >
        {isCropping ? (
          // Crop mode controls
          <>
            <Text
              fontSize="11px"
              color="rgba(255,255,255,0.3)"
              mr={2}
              letterSpacing="0.05em"
            >
              CROP MODE
            </Text>

            {/* Zoom slider while cropping */}
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
                  _focus={{ boxShadow: "0 0 0 3px rgba(99,102,241,0.3)" }}
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
            <ToolBtn icon={FiCheck} label="Apply" onClick={applyCrop} active />
          </>
        ) : (
          // Normal controls
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
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
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
                  _focus={{ boxShadow: "0 0 0 3px rgba(99,102,241,0.3)" }}
                />
              </Slider>
            </Flex>
            <ToolBtn
              icon={FiZoomIn}
              label="Zoom in"
              onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
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
      <Box flex={1} position="relative" overflow="hidden">
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
                containerStyle: { background: "#0A0A0E" },
                cropAreaStyle: {
                  border: "2px solid #6366F1",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.7)",
                },
              }}
            />
          </Box>
        ) : (
          <Flex
            h="100%"
            align="center"
            justify="center"
            overflow="hidden"
            bg="#0A0A0E"
          >
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
        bg="rgba(8,8,12,0.8)"
        flexShrink={0}
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
