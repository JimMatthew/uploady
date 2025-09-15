import { Box, Button, Text, HStack } from "@chakra-ui/react";

const Toolbar = ({ selected, handleCopy, handleShare, handleDelete, handleClear }) => {
  return (
    <HStack spacing={2} mb={2}>
      <Button
        size="sm"
        colorScheme="blue"
        isDisabled={selected.size === 0}
        onClick={handleCopy}
      >
        Copy
      </Button>
      <Button
        size="sm"
        colorScheme="blue"
        isDisabled={selected.size === 0}
        onClick={handleShare}
      >
        Share
      </Button>
      <Button
        size="sm"
        colorScheme="red"
        isDisabled={selected.size === 0}
        onClick={handleDelete}
      >
        Delete
      </Button>

      <Button
        size="sm"
        colorScheme="gray"
        isDisabled={selected.size === 0}
        onClick={handleClear}
      >
        Clear
      </Button>

      {selected.size > 0 && (
        <Text fontSize="sm" color="gray.500">
          {selected.size} item(s) selected
        </Text>
      )}
    </HStack>
  );
};

export default Toolbar;
