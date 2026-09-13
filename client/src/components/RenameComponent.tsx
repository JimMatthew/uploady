import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { Flex, HStack, Icon, Input } from "@chakra-ui/react";
import { FiCheck, FiX } from "react-icons/fi";

interface RenameComponentProps {
  currentName: string;
  handleRename: (newFilename: string) => void | Promise<void>;
  onCancel: () => void;
}

const RenameComponent = ({
  handleRename,
  onCancel,
  currentName,
}: RenameComponentProps) => {
  const [newFilename, setNewFilename] = useState(currentName);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus and select the name without the extension.
  useEffect(() => {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    input.focus();

    const dotIndex = currentName.lastIndexOf(".");

    const end = dotIndex > 0 ? dotIndex : (currentName.length);

    input.setSelectionRange(0, end);
  }, [currentName]);

  const submitRename = (): void => {
    void handleRename(newFilename);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      submitRename();
    }

    if (event.key === "Escape") {
      onCancel();
    }
  };

  const stopPropagation = (event: MouseEvent<HTMLDivElement>): void => {
    event.stopPropagation();
  };

  return (
    <HStack spacing={1} onClick={stopPropagation}>
      <Input
        ref={inputRef}
        value={newFilename}
        onChange={(event) => setNewFilename(event.target.value)}
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
        _hover={{
          borderColor: "rgba(99,102,241,0.6)",
        }}
        _placeholder={{
          color: "rgba(255,255,255,0.2)",
        }}
      />

      <Flex
        as="button"
        type="button"
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
        _hover={{
          bg: "rgba(99,102,241,0.2)",
          color: "#818CF8",
        }}
        onClick={submitRename}
        aria-label="Confirm rename"
      >
        <Icon as={FiCheck} boxSize="12px" />
      </Flex>

      <Flex
        as="button"
        type="button"
        w="26px"
        h="26px"
        align="center"
        justify="center"
        borderRadius="6px"
        cursor="pointer"
        color="rgba(255,255,255,0.25)"
        border="1px solid rgba(255,255,255,0.07)"
        bg="transparent"
        transition="all 0.12s"
        _hover={{
          bg: "rgba(239,68,68,0.1)",
          color: "#EF4444",
          borderColor: "rgba(239,68,68,0.3)",
        }}
        onClick={onCancel}
        aria-label="Cancel rename"
      >
        <Icon as={FiX} boxSize="12px" />
      </Flex>
    </HStack>
  );
};

export default RenameComponent;
