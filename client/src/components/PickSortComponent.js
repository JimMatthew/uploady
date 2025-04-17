import React from "react";
import { HStack, Text, Button, Select } from "@chakra-ui/react";
import { ChevronUpIcon, ChevronDownIcon } from "@chakra-ui/icons";

const PickSortComponent = ({
  header,
  fields, 
  selectedField,
  sortDirection,
  onFieldChange,
  onToggleDirection,
}) => {
  return (
    <HStack mb={2} justify="space-between" align="center">
      <Text fontSize="lg" fontWeight="bold">
        {header}
      </Text>

      <HStack spacing={2}>
        <Select
          size="sm"
          value={selectedField}
          onChange={(e) => onFieldChange(e.target.value)}
        >
          {fields.map((field) => (
            <option key={field} value={field}>
              {field.charAt(0).toUpperCase() + field.slice(1)}
            </option>
          ))}
        </Select>

        <Button
          size="sm"
          variant="outline"
          onClick={onToggleDirection}
          leftIcon={
            sortDirection === "asc" ? <ChevronUpIcon /> : <ChevronDownIcon />
          }
        ></Button>
      </HStack>
    </HStack>
  );
};

export default PickSortComponent;
