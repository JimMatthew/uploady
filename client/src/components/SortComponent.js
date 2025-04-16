import React from "react";
import {
  HStack,
  Text,
  Button,
} from "@chakra-ui/react";
import { ChevronUpIcon, ChevronDownIcon } from "@chakra-ui/icons";
const SortComponent = ({header, onToggle, sortDirection}) => {
  return (
    <HStack mb={2} justify="space-between" align="center">
      <Text fontSize="lg" fontWeight="bold">
        {header}
      </Text>
      <Button
        size="sm"
        variant="outline"
        onClick={onToggle}
        leftIcon={
          sortDirection === "asc" ? <ChevronUpIcon /> : <ChevronDownIcon />
        }
      >
        Sort by Name
      </Button>
    </HStack>
  );
};

export default SortComponent;
