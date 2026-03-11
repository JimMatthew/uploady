import React, { useState, useRef, useEffect } from "react";
import { Flex, Input, Icon } from "@chakra-ui/react";
import { FiFolderPlus } from "react-icons/fi";

const CreateFolderComponent = ({ handleCreateFolder }) => {
  const [expanded, setExpanded] = useState(false);
  const [folderName, setFolderName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  const handleSubmit = () => {
    if (!folderName.trim()) { setExpanded(false); return; }
    handleCreateFolder(folderName.trim());
    setFolderName("");
    setExpanded(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") { setFolderName(""); setExpanded(false); }
  };

  if (!expanded) {
    return (
      <Flex
        w="28px"
        h="28px"
        align="center"
        justify="center"
        borderRadius="6px"
        cursor="pointer"
        border="1px solid rgba(255,255,255,0.08)"
        color="rgba(255,255,255,0.3)"
        transition="all 0.12s"
        _hover={{
          borderColor: "rgba(255,255,255,0.18)",
          color: "rgba(255,255,255,0.7)",
        }}
        onClick={() => setExpanded(true)}
        title="New folder"
      >
        <Icon as={FiFolderPlus} boxSize="13px" />
      </Flex>
    );
  }

  return (
    <Flex
      align="center"
      gap={2}
      px="8px"
      h="28px"
      bg="rgba(255,255,255,0.02)"
      border="1px solid rgba(99,102,241,0.4)"
      borderRadius="7px"
      boxShadow="0 0 0 2px rgba(99,102,241,0.1)"
    >
      <Icon
        as={FiFolderPlus}
        boxSize="12px"
        color="rgba(99,102,241,0.7)"
        flexShrink={0}
      />
      <Input
        ref={inputRef}
        variant="unstyled"
        size="sm"
        placeholder="Folder name…"
        value={folderName}
        onChange={(e) => setFolderName(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={handleSubmit}
        fontSize="12px"
        fontFamily="'JetBrains Mono', monospace"
        color="rgba(255,255,255,0.85)"
        _placeholder={{ color: "rgba(255,255,255,0.25)" }}
        w="140px"
      />
    </Flex>
  );
};

export default CreateFolderComponent;