import React, { useState } from "react";
import { Flex, Input, Text, Icon, Box } from "@chakra-ui/react";
import { FiFolderPlus } from "react-icons/fi";

const CreateFolderComponent = ({ handleCreateFolder }) => {
  const [folderName, setFolderName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    handleCreateFolder(folderName);
    setFolderName("");
  };

  return (
    <Flex
      as="form"
      onSubmit={handleSubmit}
      align="center"
      gap={2}
      p="5px"
      bg="rgba(255,255,255,0.02)"
      border="1px solid rgba(255,255,255,0.07)"
      borderRadius="9px"
      maxW="340px"
      transition="border-color 0.15s"
      _focusWithin={{ borderColor: "rgba(99,102,241,0.4)" }}
    >
      <Icon as={FiFolderPlus} boxSize="14px" color="rgba(255,255,255,0.25)" ml={2} flexShrink={0} />
      <Input
        variant="unstyled"
        size="sm"
        placeholder="New folder name…"
        value={folderName}
        onChange={(e) => setFolderName(e.target.value)}
        fontSize="13px"
        fontFamily="'JetBrains Mono', monospace"
        color="rgba(255,255,255,0.8)"
        _placeholder={{ color: "rgba(255,255,255,0.2)" }}
        flex={1}
      />
      <Flex
        as="button"
        type="submit"
        align="center"
        h="28px"
        px={3}
        borderRadius="6px"
        bg="rgba(99,102,241,0.2)"
        border="1px solid rgba(99,102,241,0.3)"
        color="#818CF8"
        cursor="pointer"
        fontSize="12px"
        fontWeight={600}
        flexShrink={0}
        transition="all 0.12s"
        _hover={{ bg: "rgba(99,102,241,0.3)" }}
      >
        Create
      </Flex>
    </Flex>
  );
};

export default CreateFolderComponent;