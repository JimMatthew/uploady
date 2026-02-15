import { useState, useMemo, useCallback } from "react";

export function useFileList({
  files,
  handleFileCopy,
  handleFileDelete,
  handleFileShareLink,
}) {
  const [fileSortDirection, setFileSortDirection] = useState("asc");
  const [sortField, setSortField] = useState("name");
  const [selected, setSelected] = useState(new Set());

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

  const handleCopy = useCallback(() => {
    selected.forEach((file) => {
      handleFileCopy(file);
    });
    setSelected(new Set());
  }, [selected, handleFileCopy]);

  const handleDelete = useCallback(() => {
    selected.forEach((file) => {
      handleFileDelete(file);
    });
    setSelected(new Set());
  }, [selected, handleFileDelete]);

  const handleShare = useCallback(() => {
    selected.forEach((file) => {
      handleFileShareLink(file);
    });
    setSelected(new Set());
  }, [selected, handleFileShareLink]);

  const isSelected = useCallback(
    (fileName) => selected.has(fileName),
    [selected]
  );

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const toggleFileSort = useCallback(() => {
    setFileSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  }, []);

  const sortedFiles = useMemo(() => {
    const arr = [...files];
    if (sortField === "size") {
      return arr.sort((a, b) =>
        fileSortDirection === "asc" ? a.size - b.size : b.size - a.size
      );
    }
    if (sortField === "date") {
      return arr.sort((a, b) =>
        fileSortDirection === "asc"
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }
    return arr.sort((a, b) =>
      fileSortDirection === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );
  }, [files, fileSortDirection, sortField]);

  return {
    sortedFiles,
    fileSortDirection,
    setFileSortDirection,
    sortField,
    setSortField,
    toggleSelect,
    selected,
    handleCopy,
    handleDelete,
    handleShare,
    isSelected,
    clearSelection,
    toggleFileSort,
  };
}
