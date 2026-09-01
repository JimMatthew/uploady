import { useState, useMemo, useCallback, useEffect } from "react";

export function useFileListState({
  files,
  copyFile,
  deleteFile,
  shareFile,
}) {
  const [sortDirection, setSortDirection] = useState("asc");
  const [sortField, setSortField] = useState("name");
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    setSelected(new Set());
  }, [files]);

  const toggleSelect = useCallback((fileName) => {
    setSelected((prev) => {
      const next = new Set(prev);

      if (next.has(fileName)) {
        next.delete(fileName);
      } else {
        next.add(fileName);
      }

      return next;
    });
  }, []);

  const copySelected = useCallback(() => {
    selected.forEach(copyFile);
    setSelected(new Set());
  }, [selected, copyFile]);

  const deleteSelected = useCallback(() => {
    selected.forEach(deleteFile);
    setSelected(new Set());
  }, [selected, deleteFile]);

  const shareSelected = useCallback(() => {
    selected.forEach(shareFile);
    setSelected(new Set());
  }, [selected, shareFile]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const toggleSortDirection = useCallback(() => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  }, []);

  const sortedFiles = useMemo(() => {
    const arr = [...files];

    if (sortField === "size") {
      return arr.sort((a, b) =>
        sortDirection === "asc" ? a.size - b.size : b.size - a.size,
      );
    }

    if (sortField === "date") {
      return arr.sort((a, b) =>
        sortDirection === "asc"
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    }

    return arr.sort((a, b) =>
      sortDirection === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name),
    );
  }, [files, sortDirection, sortField]);

  return {
    sortedFiles,

    sortField,
    sortDirection,
    setSortField,
    toggleSortDirection,

    selected,
    toggleSelect,
    clearSelection,

    copySelected,
    deleteSelected,
    shareSelected,
  };
}