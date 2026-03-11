import { useState, useRef, useEffect } from "react";
import { Flex, Input, Icon, Tooltip } from "@chakra-ui/react";
import { FiFilePlus } from "react-icons/fi";

const CreateFileComponent = ({ onOpenFile }) => {
  const [expanded, setExpanded] = useState(false);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  const handleSubmit = () => {
    if (!fileName.trim()) { setExpanded(false); return; }
    onOpenFile(fileName.trim());
    setFileName("");
    setExpanded(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") { setFileName(""); setExpanded(false); }
  };

  if (!expanded) {
    return (
      <Tooltip label="New file" hasArrow openDelay={400}>
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
        >
          <Icon as={FiFilePlus} boxSize="13px" />
        </Flex>
      </Tooltip>
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
        as={FiFilePlus}
        boxSize="12px"
        color="rgba(99,102,241,0.7)"
        flexShrink={0}
      />
      <Input
        ref={inputRef}
        variant="unstyled"
        size="sm"
        placeholder="File name…"
        value={fileName}
        onChange={(e) => setFileName(e.target.value)}
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

export default CreateFileComponent;