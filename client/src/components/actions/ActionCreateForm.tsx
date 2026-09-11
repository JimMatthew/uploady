import type { Dispatch, KeyboardEvent, SetStateAction } from "react";

import {
  Button,
  Flex,
  Icon,
  Input,
  Select,
  Text,
  Textarea,
} from "@chakra-ui/react";

import type { InputProps, SelectProps } from "@chakra-ui/react";

import { FiAlertCircle, FiPlus } from "react-icons/fi";
import { ActionMode, ActionDraft } from "../../types/action";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ActionServer {
  _id: string;
  name?: string;
  host?: string;
  hostname?: string;
}

interface ActionCreateFormProps {
  action: ActionDraft;

  setAction: Dispatch<SetStateAction<ActionDraft>>;

  serverList: ActionServer[];

  creating: boolean;

  onCreate: () => void | Promise<void>;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const ActionCreateForm = ({
  action,
  setAction,
  serverList,
  creating,
  onCreate,
}: ActionCreateFormProps) => {
  const hasServers = serverList.length > 0;

  const handleCommandKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ): void => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();

      void onCreate();
    }
  };

  return (
    <>
      {!hasServers && (
        <Flex
          align="center"
          gap={2}
          mb={3}
          px={3}
          py={2}
          borderRadius="6px"
          bg="rgba(250,204,21,0.06)"
          border="1px solid rgba(250,204,21,0.15)"
        >
          <Icon
            as={FiAlertCircle}
            boxSize="12px"
            color="rgba(250,204,21,0.7)"
          />

          <Text fontSize="11px" color="rgba(250,204,21,0.8)">
            Add a server before creating an action.
          </Text>
        </Flex>
      )}

      <Flex
        direction={{
          base: "column",
          md: "row",
        }}
        gap={3}
        mb={3}
      >
        <ActionInput
          value={action.name}
          onChange={(event) =>
            setAction((previous) => ({
              ...previous,
              name: event.target.value,
            }))
          }
          placeholder="Action name"
          isDisabled={creating}
          flex={1}
        />

        <ActionSelect
          value={action.serverId}
          onChange={(event) =>
            setAction((previous) => ({
              ...previous,
              serverId: event.target.value,
            }))
          }
          isDisabled={creating || !hasServers}
          maxW={{
            base: "100%",
            md: "240px",
          }}
        >
          <option value="">Select server</option>

          {serverList.map((server) => (
            <option key={server._id} value={server._id}>
              {server.name || server.host || server.hostname || server._id}
            </option>
          ))}
        </ActionSelect>

        <ActionSelect
          value={action.mode}
          onChange={(event) =>
            setAction((previous) => ({
              ...previous,
              mode: event.target.value as ActionMode,
            }))
          }
          isDisabled={creating}
          maxW={{
            base: "100%",
            md: "170px",
          }}
        >
          <option value="capture">Capture Output</option>

          <option value="terminal">Open Terminal</option>
        </ActionSelect>
      </Flex>

      <ActionInput
        value={action.description}
        onChange={(event) =>
          setAction((previous) => ({
            ...previous,
            description: event.target.value,
          }))
        }
        placeholder="Description (optional)"
        isDisabled={creating}
        mb={3}
      />

      <Textarea
        value={action.command}
        onChange={(event) =>
          setAction((previous) => ({
            ...previous,
            command: event.target.value,
          }))
        }
        onKeyDown={handleCommandKeyDown}
        placeholder="Command"
        isDisabled={creating}
        size="sm"
        minH="90px"
        resize="vertical"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="12px"
        borderColor="rgba(255,255,255,0.08)"
        bg="rgba(255,255,255,0.025)"
        _hover={{
          borderColor: "rgba(255,255,255,0.15)",
        }}
        _focusVisible={{
          borderColor: "#6366F1",
          boxShadow: "none",
        }}
      />

      <Flex justify="space-between" align="center" mt={4}>
        <Text fontSize="10px" color="rgba(255,255,255,0.25)">
          ⌘/Ctrl + Enter to create
        </Text>

        <Button
          size="sm"
          leftIcon={<FiPlus />}
          onClick={() => {
            void onCreate();
          }}
          isLoading={creating}
          isDisabled={!hasServers}
          bg="rgba(99,102,241,0.15)"
          color="#A5B4FC"
          border="1px solid rgba(99,102,241,0.3)"
          _hover={{
            bg: "rgba(99,102,241,0.25)",
          }}
        >
          Create Action
        </Button>
      </Flex>
    </>
  );
};

// -----------------------------------------------------------------------------
// Styled controls
// -----------------------------------------------------------------------------

const ActionInput = (props: InputProps) => (
  <Input
    size="sm"
    borderColor="rgba(255,255,255,0.08)"
    bg="rgba(255,255,255,0.025)"
    _hover={{
      borderColor: "rgba(255,255,255,0.15)",
    }}
    _focusVisible={{
      borderColor: "#6366F1",
      boxShadow: "none",
    }}
    {...props}
  />
);

const ActionSelect = (props: SelectProps) => (
  <Select
    size="sm"
    borderColor="rgba(255,255,255,0.08)"
    bg="rgba(255,255,255,0.025)"
    _hover={{
      borderColor: "rgba(255,255,255,0.15)",
    }}
    _focusVisible={{
      borderColor: "#6366F1",
      boxShadow: "none",
    }}
    {...props}
  />
);

export default ActionCreateForm;
