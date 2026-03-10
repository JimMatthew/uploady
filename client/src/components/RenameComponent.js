import React, { useState, useRef, useEffect } from "react";
import { Box, HStack, Input, Flex, Icon } from "@chakra-ui/react";
import { FiCheck, FiX } from "react-icons/fi";

const RenameComponent = ({ handleRename, onCancel, currentName }) => {
  const [newFilename, setNewFilename] = useState(currentName ?? "");
  const inputRef = useRef(null);

  // Auto-focus and select the name without the extension
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.focus();
    const dotIndex = currentName?.lastIndexOf(".");
    const end = dotIndex > 0 ? dotIndex : (currentName?.length ?? 0);
    inputRef.current.setSelectionRange(0, end);
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "Enter") handleRename(newFilename);
    if (e.key === "Escape") onCancel();
  };

  return (
    <HStack spacing={1} onClick={(e) => e.stopPropagation()}>
      <Input
        ref={inputRef}
        value={newFilename}
        onChange={(e) => setNewFilename(e.target.value)}
        onKeyDown={onKeyDown}
        size="sm"
        bg="rgba(255,255,255,0.05)"
        border="1px solid rgba(99,102,241,0.4)"
        borderRadius="6px"
        color="rgba(255,255,255,0.85)"
        fontSize="12px"
        fontFamily="'JetBrains Mono', monospace"
        h="26px"
        px={2}
        _focus={{
          borderColor: "#6366F1",
          boxShadow: "0 0 0 2px rgba(99,102,241,0.2)",
        }}
        _hover={{ borderColor: "rgba(99,102,241,0.6)" }}
        _placeholder={{ color: "rgba(255,255,255,0.2)" }}
      />
      <Flex
        w="26px"
        h="26px"
        align="center"
        justify="center"
        borderRadius="6px"
        cursor="pointer"
        color="rgba(99,102,241,0.8)"
        border="1px solid rgba(99,102,241,0.3)"
        bg="rgba(99,102,241,0.1)"
        transition="all 0.12s"
        _hover={{ bg: "rgba(99,102,241,0.2)", color: "#818CF8" }}
        onClick={() => handleRename(newFilename)}
      >
        <Icon as={FiCheck} boxSize="12px" />
      </Flex>
      <Flex
        w="26px"
        h="26px"
        align="center"
        justify="center"
        borderRadius="6px"
        cursor="pointer"
        color="rgba(255,255,255,0.25)"
        border="1px solid rgba(255,255,255,0.07)"
        transition="all 0.12s"
        _hover={{
          bg: "rgba(239,68,68,0.1)",
          color: "#EF4444",
          borderColor: "rgba(239,68,68,0.3)",
        }}
        onClick={onCancel}
      >
        <Icon as={FiX} boxSize="12px" />
      </Flex>
    </HStack>
  );
};

export default RenameComponent;
