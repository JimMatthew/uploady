import { Box, Text, Progress } from "@chakra-ui/react";
const TransferProgress = ({ transfers, progressMap }) => (
  <>
    {Object.entries(transfers).map(([id, { file }]) => (
      <Box key={id} mb={2} p={3} borderRadius="md" borderWidth="1px">
        <Text>{file}</Text>
        <Progress
          value={progressMap[id]?.progress || 0}
          size="sm"
          colorScheme="blue"
        />
      </Box>
    ))}
  </>
);

export default TransferProgress;
