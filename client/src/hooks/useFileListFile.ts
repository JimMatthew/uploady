import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  FileEntry,
  FileAction,
  SortField,
  SortDirection,
  FileBatchAction,
} from "../types/fileBrowser";

import {
  SORT_DIRECTIONS,
  SORT_FIELDS,
} from "../types/fileBrowser";

interface UseFileListStateOptions {
  files?: FileEntry[];
  copyFile?: FileAction;
  deleteFile?: FileAction;
  deleteFiles?: FileBatchAction;
  shareFile?: FileAction;
}

interface UseFileListStateResult {
  sortedFiles: FileEntry[];

  sortField: SortField;
  sortDirection: SortDirection;
  setSortField: (field: SortField) => void;
  toggleSortDirection: () => void;

  selected: Set<string>;
  toggleSelect: (fileName: string) => void;
  clearSelection: () => void;

  setFileSelected: (fileName: string, shouldSelect: boolean) => void;

  copySelected: () => Promise<void>;
  deleteSelected: () => Promise<void>;
  shareSelected: () => Promise<void>;
}

export function useFileListState({
  files = [],
  copyFile,
  deleteFile,
  deleteFiles,
  shareFile,
}: UseFileListStateOptions): UseFileListStateResult {
  const [sortField, setSortField] = useState<SortField>(SORT_FIELDS.NAME);

  const [sortDirection, setSortDirection] = useState<SortDirection>(
    SORT_DIRECTIONS.ASC,
  );

  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  /*
   * A new file listing represents a new view of the directory,
   * so discard selection belonging to the previous listing.
   */
  useEffect(() => {
    setSelected(new Set());
  }, [files]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const toggleSelect = useCallback((fileName: string) => {
    setSelected((current) => {
      const next = new Set(current);

      if (next.has(fileName)) {
        next.delete(fileName);
      } else {
        next.add(fileName);
      }

      return next;
    });
  }, []);

  const setFileSelected = useCallback(
    (fileName: string, shouldSelect: boolean) => {
      setSelected((current) => {
        const currentlySelected = current.has(fileName);

        if (currentlySelected === shouldSelect) {
          return current;
        }

        const next = new Set(current);

        if (shouldSelect) {
          next.add(fileName);
        } else {
          next.delete(fileName);
        }

        return next;
      });
    },
    [],
  );

  const executeForSelected = useCallback(
    async (operation?: FileAction): Promise<void> => {
      if (!operation) {
        return;
      }

      const selectedFiles = [...selected];

      if (selectedFiles.length === 0) {
        return;
      }

      await Promise.all(selectedFiles.map(operation));

      clearSelection();
    },
    [selected, clearSelection],
  );

  const copySelected = useCallback(
    () => executeForSelected(copyFile),
    [executeForSelected, copyFile],
  );

  const deleteSelected = useCallback(async (): Promise<void> => {
  if (!deleteFiles || selected.size === 0) {
    return;
  }

  await deleteFiles([...selected]);
  clearSelection();
}, [deleteFiles, selected, clearSelection]);

  const shareSelected = useCallback(
    () => executeForSelected(shareFile),
    [executeForSelected, shareFile],
  );

  const toggleSortDirection = useCallback(() => {
    setSortDirection((current) =>
      current === SORT_DIRECTIONS.ASC
        ? SORT_DIRECTIONS.DESC
        : SORT_DIRECTIONS.ASC,
    );
  }, []);

  const sortedFiles = useMemo(() => {
    const direction = sortDirection === SORT_DIRECTIONS.ASC ? 1 : -1;

    return [...files].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case SORT_FIELDS.SIZE: {
          const aSize =
            typeof a.size === "number"
              ? a.size
              : Number.parseFloat(a.size ?? "0");

          const bSize =
            typeof b.size === "number"
              ? b.size
              : Number.parseFloat(b.size ?? "0");

          comparison =
            (Number.isNaN(aSize) ? 0 : aSize) -
            (Number.isNaN(bSize) ? 0 : bSize);

          break;
        }
        case SORT_FIELDS.DATE: {
          const aTime = a.date != null ? new Date(a.date).getTime() : 0;
          const bTime = b.date != null ? new Date(b.date).getTime() : 0;
          comparison = aTime - bTime;
          break;
        }

        case SORT_FIELDS.NAME:
        default:
          comparison = a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: "base",
          });
          break;
      }

      return comparison * direction;
    });
  }, [files, sortField, sortDirection]);

  return {
    sortedFiles,

    sortField,
    sortDirection,
    setSortField,
    toggleSortDirection,

    selected,
    toggleSelect,
    clearSelection,
    setFileSelected,

    copySelected,
    deleteSelected,
    shareSelected,
  };
}
