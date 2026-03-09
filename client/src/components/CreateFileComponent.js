import { useState, useRef } from "react";
import { Flex, Input, IconButton, Tooltip } from "@chakra-ui/react";
import { FilePlus, Check, X } from "lucide-react";

/**
 * Renders a "+ New File" button that expands inline to accept a filename.
 * On confirm, creates an empty file and opens it in the editor.
 * @param {{ currentDirectory: string, onOpenFile: (file: object) => void, onCreateSuccess: () => void }} props
 */
const CreateFileComponent = ({ onOpenFile }) => {
  const [isEntering, setIsEntering] = useState(false);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef(null);

  const open = () => {
    setFileName("");
    setIsEntering(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancel = () => {
    setIsEntering(false);
    setFileName("");
  };

  const confirm = async () => {
    const trimmed = fileName.trim();
    if (!trimmed) return;
    onOpenFile(trimmed);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") confirm();
    if (e.key === "Escape") cancel();
  };

  if (isEntering) {
    return (
      <Flex align="center" gap={1}>
        <Input
          ref={inputRef}
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="filename.txt"
          size="sm"
          w="140px"
          bg="rgba(255,255,255,0.05)"
          border="1px solid rgba(99,102,241,0.5)"
          borderRadius="md"
          color="white"
          fontSize="0.8rem"
          _focus={{ borderColor: "#6366F1", boxShadow: "none" }}
          _placeholder={{ color: "whiteAlpha.400" }}
        />
        <Tooltip label="Create">
          <IconButton
            icon={<Check size={14} />}
            size="sm"
            variant="ghost"
            color="#6366F1"
            _hover={{ bg: "rgba(99,102,241,0.15)" }}
            onClick={confirm}
            aria-label="Confirm"
          />
        </Tooltip>
        <Tooltip label="Cancel">
          <IconButton
            icon={<X size={14} />}
            size="sm"
            variant="ghost"
            color="whiteAlpha.500"
            _hover={{ bg: "rgba(255,255,255,0.06)" }}
            onClick={cancel}
            aria-label="Cancel"
          />
        </Tooltip>
      </Flex>
    );
  }

  return (
    <Tooltip label="New file">
      <IconButton
        icon={<FilePlus size={15} />}
        size="sm"
        variant="ghost"
        color="whiteAlpha.600"
        _hover={{ color: "white", bg: "rgba(255,255,255,0.06)" }}
        onClick={open}
        aria-label="New file"
      />
    </Tooltip>
  );
};

export default CreateFileComponent;
