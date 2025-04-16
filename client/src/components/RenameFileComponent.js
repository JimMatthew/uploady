import React from "react";
import {
  Box,
  HStack,
  Button,
  Input,
} from "@chakra-ui/react";

const RenameFileComponent = ({newFilename, onInput, handleRename, onCancel }) => {
  return (
    <Box>
      <HStack>
        <Input
          placeholder="New filename"
          value={newFilename}
          onChange={(e) => onInput(e.target.value)}
          size="sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
          }}
        />
        <Button size="sm" onClick={() => handleRename()}>
          submit
        </Button>
        <Button size="sm" onClick={() => onCancel()}>
          cancel
        </Button>
      </HStack>
    </Box>
  );
};

export default RenameFileComponent;
