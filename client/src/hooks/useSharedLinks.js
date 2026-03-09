import { useToast } from "@chakra-ui/react";
import { useState } from "react";

export function useSharedLinks() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const toast = useToast();

  const showToast = (title, status) =>
    toast({ title, status, duration: 2500, isClosable: true });

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const loadLinks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/links", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLinks(data.links);
    } catch (err) {
      console.error("Error loading links:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────

  const deleteLink = async (linkToken) => {
    try {
      await fetch("/api/stop-sharing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: linkToken }),
      });
      await loadLinks();
      showToast("Link deleted", "success");
    } catch {
      showToast("Error deleting link", "error");
    }
  };

  // ─── Clipboard ────────────────────────────────────────────────────────────

  /**
   * Copies text to clipboard with a fallback for browsers that don't
   * support the async Clipboard API (e.g. non-HTTPS contexts).
   * @param {string} text
   */
  const copyToClip = async (text) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-HTTPS or older browsers
        const el = document.createElement("textarea");
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      showToast("Link copied!", "success");
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      showToast("Failed to copy link", "error");
    }
  };

  // ─── Download ─────────────────────────────────────────────────────────────

  /**
   * Downloads a shared file via its public link.
   * No auth header — share links are intentionally public.
   * @param {string} link
   * @param {string} fileName
   */
  const clickLink = async (link, fileName) => {
    try {
      const res = await fetch(link);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: fileName,
      });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error("Download error:", err);
      showToast("Error downloading file", "error");
    }
  };

  return {
    clickLink,
    deleteLink,
    copyToClip,
    links,
    loading,
    loadLinks,
  };
}
