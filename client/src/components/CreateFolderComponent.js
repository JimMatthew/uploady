import { useEffect, useRef, useState } from "react";
import { Flex, Icon, IconButton, Input, Tooltip } from "@chakra-ui/react";
import { FiCheck, FiFolderPlus, FiX } from "react-icons/fi";

const CreateFolderComponent = ({ handleCreateFolder }) => {
  const [expanded, setExpanded] = useState(false);
  const [folderName, setFolderName] = useState("");

  const inputRef = useRef(null);

  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus();
    }
  }, [expanded]);

  const reset = () => {
    setFolderName("");
    setExpanded(false);
  };

  const handleSubmit = () => {
    const name = folderName.trim();

    if (!name) {
      reset();
      return;
    }

    handleCreateFolder(name);
    reset();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSubmit();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      reset();
    }
  };

  if (!expanded) {
    return (
      <Tooltip label="New folder" hasArrow openDelay={400}>
        <IconButton
          aria-label="New folder"
          icon={<FiFolderPlus size={13} />}
          size="sm"
          minW="28px"
          w="28px"
          h="28px"
          borderRadius="7px"
          border="1px solid"
          borderColor="rgba(255,255,255,0.08)"
          bg="rgba(255,255,255,0.02)"
          color="rgba(255,255,255,0.38)"
          transition="
            background 120ms ease,
            border-color 120ms ease,
            color 120ms ease
          "
          _hover={{
            bg: "rgba(255,255,255,0.055)",
            borderColor: "rgba(255,255,255,0.13)",
            color: "rgba(255,255,255,0.72)",
          }}
          onClick={() => setExpanded(true)}
        />
      </Tooltip>
    );
  }

  return (
    <Flex
      align="center"
      gap="5px"
      h="28px"
      pl="8px"
      pr="3px"
      flexShrink={0}
      borderRadius="7px"
      bg="rgba(255,255,255,0.025)"
      border="1px solid"
      borderColor="rgba(129,140,248,0.3)"
      boxShadow="0 0 0 2px rgba(129,140,248,0.06)"
    >
      <Icon as={FiFolderPlus} boxSize="12px" flexShrink={0} color="#A5B4FC" />

      <Input
        ref={inputRef}
        variant="unstyled"
        size="sm"
        w="135px"
        value={folderName}
        placeholder="Folder name…"
        fontSize="11px"
        fontFamily="'JetBrains Mono', monospace"
        color="rgba(255,255,255,0.82)"
        _placeholder={{
          color: "rgba(255,255,255,0.25)",
        }}
        onChange={(event) => setFolderName(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={reset}
      />

      <Tooltip label="Create folder" hasArrow openDelay={400}>
        <IconButton
          aria-label="Create folder"
          icon={<FiCheck size={11} />}
          size="sm"
          minW="22px"
          w="22px"
          h="22px"
          borderRadius="5px"
          bg="transparent"
          color={folderName.trim() ? "#A5B4FC" : "rgba(255,255,255,0.18)"}
          isDisabled={!folderName.trim()}
          _disabled={{
            opacity: 1,
            cursor: "default",
          }}
          _hover={
            folderName.trim()
              ? {
                  bg: "rgba(129,140,248,0.1)",
                }
              : {}
          }
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={handleSubmit}
        />
      </Tooltip>

      <Tooltip label="Cancel" hasArrow openDelay={400}>
        <IconButton
          aria-label="Cancel new folder"
          icon={<FiX size={11} />}
          size="sm"
          minW="22px"
          w="22px"
          h="22px"
          borderRadius="5px"
          bg="transparent"
          color="rgba(255,255,255,0.28)"
          _hover={{
            bg: "rgba(255,255,255,0.055)",
            color: "rgba(255,255,255,0.65)",
          }}
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={reset}
        />
      </Tooltip>
    </Flex>
  );
};

export default CreateFolderComponent;
