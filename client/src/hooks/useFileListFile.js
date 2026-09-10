import { useCallback, useEffect, useMemo, useState } from "react";

const SORT_FIELDS = {
  NAME: "name",
  SIZE: "size",
  DATE: "date",
};

const SORT_DIRECTIONS = {
  ASC: "asc",
  DESC: "desc",
};

export function useFileListState({
  files = [],
  copyFile,
  deleteFile,
  shareFile,
}) {
  const [sortField, setSortField] = useState(SORT_FIELDS.NAME);
  const [sortDirection, setSortDirection] = useState(SORT_DIRECTIONS.ASC);
  const [selected, setSelected] = useState(() => new Set());

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

  const toggleSelect = useCallback((fileName) => {
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

    const setFileSelected = useCallback((fileName, shouldSelect) => {
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
  }, []);

  const executeForSelected = useCallback(
    async (operation) => {
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

  const deleteSelected = useCallback(
    () => executeForSelected(deleteFile),
    [executeForSelected, deleteFile],
  );

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
      let comparison;

      switch (sortField) {
        case SORT_FIELDS.SIZE:
          comparison = (a.size ?? 0) - (b.size ?? 0);
          break;

        case SORT_FIELDS.DATE:
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;

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
