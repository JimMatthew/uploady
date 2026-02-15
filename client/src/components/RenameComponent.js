import React, { useState } from "react";
import { Box, HStack, Button, Input } from "@chakra-ui/react";

const RenameComponent = ({ handleRename, onCancel }) => {
  const [newFilename, setNewFilename] = useState("");
  return (
    <Box>
      <HStack>
        <Input
          placeholder="New filename"
          value={newFilename}
          onChange={(e) => setNewFilename(e.target.value)}
          size="sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename(newFilename);
          }}
        />
        <Button size="sm" onClick={() => handleRename(newFilename)}>
          submit
        </Button>
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
        >
          cancel
        </Button>
      </HStack>
    </Box>
  );
};

export default RenameComponent;
