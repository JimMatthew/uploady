import { createContext, useContext, useState } from "react";

const ClipboardContext = createContext();

export const ClipboardProvider = ({ children }) => {
    const [clipboard, setClipboard] = useState(null);

    const copyFile = ({ file, path, source, serverId }) => {
        setClipboard({
            file,
            path, 
            source,
            serverId: serverId || null,
            action: "copy",
        });
    };

    const clearClipboard = () => {
        setClipboard(null);
    }

    return (
        <ClipboardContext.Provider value={{ clipboard, copyFile, clearClipboard }}>
            {children}
        </ClipboardContext.Provider>
    )
}

export const useClipboard = () => useContext(ClipboardContext);