import { useState, useMemo } from "react";
import { useClipboard } from "../contexts/ClipboardContext";

export function useSftpFileList({ files, renameFile }) {

    const [showRenameInput, setShowRenameInput] = useState(false);
    const [newFilename, setNewFilename] = useState("");
    const [renameId, setRenameId] = useState("");
    const [fileSortDirection, setFileSortDirection] = useState("asc");
    const [sortField, setSortField] = useState("name");

    const { clipboard } = useClipboard();

    const toggleFileSort = () =>
        setFileSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));

    const handleRename = (filename) => {
        renameFile(filename, newFilename);
        setShowRenameInput(false);
        setNewFilename("");
    };

    const sortedfiles = useMemo(() => {
        if (sortField === "size") {
            return [...files].sort((a, b) =>
                fileSortDirection === "asc" ? a.size - b.size : b.size - a.size
            );
        } else if (sortField === "date") {
            return [...files].sort((a, b) =>
                fileSortDirection === "asc"
                    ? new Date(a.date) - new Date(b.date)
                    : new Date(b.date) - new Date(a.date)
            );
        }
        return [...files].sort((a, b) =>
            fileSortDirection === "asc"
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name)
        );
    }, [files, fileSortDirection, sortField]);
    return {
        showRenameInput,
        setShowRenameInput,
        newFilename,
        setNewFilename,
        renameId,
        setRenameId,
        fileSortDirection,
        sortField,
        setSortField,
        clipboard,
        toggleFileSort,
        handleRename,
        sortedfiles
    }
}