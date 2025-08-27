import {
    useDisclosure,
    useToast,
} from "@chakra-ui/react";

export function useSharedLinks({ onReload }) {

    const { isOpen, onToggle } = useDisclosure();
    const token = localStorage.getItem("token");
    const toast = useToast();

    const handleShowLinks = () => {
        if (isOpen) {
            onToggle();
            return;
        }
        onToggle();
        onReload();
    };

    const deleteLink = (linkToken) => {
        fetch(`/api/stop-sharing`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ token: linkToken }),
        })
            .then((res) => res.json())
            .then(onReload())
            .catch((err) => {
                toast({
                    title: "Error",
                    status: "error",
                    duration: 3000,
                    isClosable: true,
                });
            });
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Link copied!",
            status: "success",
            duration: 2000,
            isClosable: true,
        });
    };

    const copyToClip = (text) => {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
            // If clipboard API is available, use it
            navigator.clipboard
                .writeText(text)
                .then(() => {
                    toast({
                        title: "Link copied!",
                        status: "success",
                        duration: 2000,
                        isClosable: true,
                    });
                })
                .catch((err) => {
                    console.error("Failed to copy text to clipboard", err);
                });
        } else {
            // Fallback for browsers that don't support Clipboard API
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand("copy");
                toast({
                    title: "Link copied!",
                    status: "success",
                    duration: 2000,
                    isClosable: true,
                });
            } catch (err) {
                console.error("Fallback method failed to copy text", err);
            }
            document.body.removeChild(textArea);
        }
    };

    const clickLink = (link, fileName) => {
        fetch(link, {
            headers: {},
        })
            .then((res) => res.blob())
            .then((blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
            })
            .catch((error) => console.error("Download error:", error));
    };

    return {
        clickLink,
        handleShowLinks,
        deleteLink,
        copyToClip,
        isOpen,
    }
}