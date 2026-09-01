import { useCallback, useState } from "react";
import { useToast } from "@chakra-ui/react";
import apiClient from "../services/apiClient";

export function useSharedLinks() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const toast = useToast();

  const showToast = useCallback(
    (title, status) => {
      toast({
        title,
        status,
        duration: 2500,
        isClosable: true,
      });
    },
    [toast],
  );

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const loadLinks = useCallback(async () => {
    setLoading(true);

    try {
      const data = await apiClient.get("/api/links");

      setLinks(data.links ?? []);
    } catch (err) {
      console.error("Error loading links:", err);
      showToast("Error loading shared links", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // ─── Delete ───────────────────────────────────────────────────────────────

  const deleteLink = useCallback(
    async (linkToken) => {
      try {
        await apiClient.post("/api/stop-sharing", {
          token: linkToken,
        });

        await loadLinks();

        showToast("Link deleted", "success");
      } catch (err) {
        console.error("Error deleting link:", err);
        showToast("Error deleting link", "error");
      }
    },
    [loadLinks, showToast],
  );

  // ─── Clipboard ────────────────────────────────────────────────────────────

  /**
   * Copies text to the clipboard.
   * Falls back to execCommand for browsers or contexts where the
   * asynchronous Clipboard API is unavailable.
   *
   * @param {string} text
   */
  const copyToClipboard = useCallback(
    async (text) => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement("textarea");

          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";

          document.body.appendChild(textarea);

          textarea.select();
          document.execCommand("copy");

          textarea.remove();
        }

        showToast("Link copied!", "success");
      } catch (err) {
        console.error("Failed to copy to clipboard:", err);
        showToast("Failed to copy link", "error");
      }
    },
    [showToast],
  );

  // ─── Download ─────────────────────────────────────────────────────────────

  /**
   * Downloads a shared file using its public share URL.
   * This intentionally does not use apiClient because share links
   * are public and do not require Uploady authentication.
   *
   * @param {string} link
   * @param {string} fileName
   */
  const clickLink = useCallback(
    async (link, fileName) => {
      try {
        const res = await fetch(link);

        if (!res.ok) {
          throw new Error(`Download failed with status ${res.status}`);
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);

        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;

        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 5000);
      } catch (err) {
        console.error("Download error:", err);
        showToast("Error downloading file", "error");
      }
    },
    [showToast],
  );

  return {
    links,
    loading,
    loadLinks,
    deleteLink,
    copyToClipboard,
    clickLink,
  };
}
