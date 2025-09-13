import { useState, useMemo } from "react";

export function useFileList({ files }) {
  const [fileSortDirection, setFileSortDirection] = useState("asc");
  const [sortField, setSortField] = useState("name");

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
  };
}
