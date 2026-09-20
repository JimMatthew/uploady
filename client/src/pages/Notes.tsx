import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Box,
  Button,
  Flex,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  Text,
  Textarea,
} from "@chakra-ui/react";

import {
  FiFileText,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";

import apiClient from "../services/apiClient";

import type {
  NoteResponse,
  ListNotesResponse,
  CreateNoteRequest,
  CreateNoteResponse,
  UpdateNoteRequest,
  UpdateNoteResponse,
  DeleteNoteResponse,
} from "../../../shared/api/notes";

import type { AppToast } from "../hooks/useAppToast";

interface NotesProps {
  toast: AppToast;
}

const getErrorMessage = (error: unknown): string | undefined => {
  if (error instanceof Error) {
    return error.message;
  }

  return undefined;
};

const Notes = ({ toast }: NotesProps) => {
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selectedNote = notes.find((note) => note._id === selectedId) ?? null;

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  const selectNote = useCallback((note: NoteResponse): void => {
    setSelectedId(note._id);
    setName(note.name ?? "");
    setContent(note.content);
  }, []);

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------

  const loadNotes = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadFailed(false);

    try {
      const response = await apiClient.get<ListNotesResponse>("/api/notes");

      setNotes(response.notes);

      const firstNote = response.notes[0];

      if (firstNote) {
        selectNote(firstNote);
      } else {
        setSelectedId(null);
        setName("");
        setContent("");
      }
    } catch (error: unknown) {
      console.error("Failed to load notes:", error);

      setLoadFailed(true);

      toast({
        title: "Couldn't load notes",
        description: getErrorMessage(error) ?? "",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [selectNote, toast]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  const createNote = async (): Promise<void> => {
    const request: CreateNoteRequest = {
      content: "",
    };

    setCreating(true);

    try {
      const response = await apiClient.post<CreateNoteResponse>(
        "/api/notes",
        request,
      );

      setNotes((previous) => [response.note, ...previous]);

      selectNote(response.note);
    } catch (error: unknown) {
      console.error("Failed to create note:", error);

      toast({
        title: "Failed to create note",
        description: getErrorMessage(error) ?? "",
        status: "error",
      });
    } finally {
      setCreating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  const saveNote = async (): Promise<void> => {
    if (!selectedNote) {
      return;
    }

    const request: UpdateNoteRequest = {
      name: name.trim() || null,
      content,
    };

    setSaving(true);

    try {
      const response = await apiClient.post<UpdateNoteResponse>(
        `/api/notes/${selectedNote._id}`,
        request,
      );

      setNotes((previous) =>
        previous.map((note) =>
          note._id === response.note._id ? response.note : note,
        ),
      );

      selectNote(response.note);

      toast({
        title: "Note saved",
        status: "success",
      });
    } catch (error: unknown) {
      console.error("Failed to save note:", error);

      toast({
        title: "Failed to save note",
        description: getErrorMessage(error) ?? "",
        status: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const deleteNote = async (): Promise<void> => {
    if (!selectedNote) {
      return;
    }

    setDeleting(true);

    try {
      await apiClient.delete<DeleteNoteResponse>(
        `/api/notes/${selectedNote._id}`,
      );

      const remaining = notes.filter((note) => note._id !== selectedNote._id);

      setNotes(remaining);
      const nextNote = remaining[0];
      if (nextNote) {
        selectNote(nextNote);
      } else {
        setSelectedId(null);
        setName("");
        setContent("");
      }

      toast({
        title: "Note deleted",
        status: "success",
      });
    } catch (error: unknown) {
      console.error("Failed to delete note:", error);

      toast({
        title: "Failed to delete note",
        description: getErrorMessage(error) ?? "",
        status: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return notes;
    }

    return notes.filter((note) => {
      return [note.name ?? "", note.content]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [notes, search]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box h="100%" p={6}>
      <Flex h="100%" maxW="1200px" mx="auto" direction="column" gap={5}>
        <Flex align="center" justify="space-between">
          <Box>
            <Text
              fontSize="20px"
              fontWeight={600}
              color="rgba(255,255,255,0.9)"
            >
              Notes
            </Text>

            <Text mt={1} fontSize="13px" color="rgba(255,255,255,0.35)">
              Quick references, commands, and anything worth keeping handy.
            </Text>
          </Box>

          <Button
            size="sm"
            leftIcon={<FiPlus />}
            onClick={() => {
              void createNote();
            }}
            isLoading={creating}
          >
            New Note
          </Button>
        </Flex>

        {loading ? (
          <Flex flex={1} align="center" justify="center" gap={3}>
            <Spinner size="sm" />

            <Text fontSize="12px" color="rgba(255,255,255,0.3)">
              Loading notes...
            </Text>
          </Flex>
        ) : loadFailed ? (
          <Flex
            flex={1}
            direction="column"
            align="center"
            justify="center"
            gap={3}
          >
            <Text fontSize="13px" color="rgba(252,165,165,0.7)">
              Couldn't load your notes.
            </Text>

            <Button
              size="xs"
              leftIcon={<FiRefreshCw />}
              onClick={() => {
                void loadNotes();
              }}
              variant="ghost"
            >
              Try again
            </Button>
          </Flex>
        ) : (
          <Flex
            flex={1}
            minH={0}
            border="1px solid rgba(255,255,255,0.08)"
            borderRadius="10px"
            overflow="hidden"
          >
            <Flex
              w="280px"
              minW="280px"
              direction="column"
              borderRight="1px solid rgba(255,255,255,0.08)"
              bg="rgba(255,255,255,0.015)"
            >
              <Box p={3}>
                <InputGroup size="sm">
                  <InputLeftElement pointerEvents="none">
                    <Icon
                      as={FiSearch}
                      boxSize="12px"
                      color="rgba(255,255,255,0.25)"
                    />
                  </InputLeftElement>

                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search notes"
                    borderColor="rgba(255,255,255,0.08)"
                    bg="rgba(255,255,255,0.025)"
                  />
                </InputGroup>
              </Box>

              <Box flex={1} overflowY="auto">
                {filteredNotes.map((note) => {
                  const selected = note._id === selectedId;

                  return (
                    <Box
                      key={note._id}
                      px={4}
                      py={3}
                      cursor="pointer"
                      borderTop="1px solid rgba(255,255,255,0.05)"
                      bg={selected ? "rgba(255,255,255,0.06)" : "transparent"}
                      _hover={{
                        bg: "rgba(255,255,255,0.04)",
                      }}
                      onClick={() => selectNote(note)}
                    >
                      <Text
                        fontSize="13px"
                        fontWeight={500}
                        noOfLines={1}
                        color="rgba(255,255,255,0.8)"
                      >
                        {note.name || "Untitled"}
                      </Text>

                      <Text
                        mt={1}
                        fontSize="11px"
                        noOfLines={2}
                        color="rgba(255,255,255,0.3)"
                      >
                        {note.content || "Empty note"}
                      </Text>
                    </Box>
                  );
                })}
              </Box>
            </Flex>

            <Flex flex={1} minW={0} direction="column">
              {selectedNote ? (
                <>
                  <Flex
                    p={4}
                    gap={3}
                    align="center"
                    borderBottom="1px solid rgba(255,255,255,0.08)"
                  >
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Untitled"
                      variant="unstyled"
                      fontSize="16px"
                      fontWeight={600}
                    />

                    <Button
                      size="xs"
                      onClick={() => {
                        void saveNote();
                      }}
                      isLoading={saving}
                    >
                      Save
                    </Button>

                    <Button
                      size="xs"
                      variant="ghost"
                      leftIcon={<FiTrash2 />}
                      onClick={() => {
                        void deleteNote();
                      }}
                      isLoading={deleting}
                    >
                      Delete
                    </Button>
                  </Flex>

                  <Textarea
                    flex={1}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="Start writing..."
                    resize="none"
                    border="0"
                    borderRadius={0}
                    _focusVisible={{
                      boxShadow: "none",
                    }}
                    p={5}
                    fontSize="14px"
                    lineHeight="1.7"
                  />
                </>
              ) : (
                <Flex
                  flex={1}
                  direction="column"
                  align="center"
                  justify="center"
                  gap={3}
                  color="rgba(255,255,255,0.25)"
                >
                  <Icon as={FiFileText} boxSize="24px" />

                  <Text fontSize="13px">Create a note to get started.</Text>
                </Flex>
              )}
            </Flex>
          </Flex>
        )}
      </Flex>
    </Box>
  );
};

export default Notes;
