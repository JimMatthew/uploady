import { useCallback, useState } from "react";

import { useToast } from "@chakra-ui/react";

import apiClient from "../services/apiClient";

type ToastStatus = "success" | "error" | "warning" | "info";

export interface SharedLink {
  _id: string;
  fileName: string;
  filePath: string;
  link: string;
  token: string;
  isRemote: boolean;
  serverId?: string;
  serverName?: string;
  sharedAt: string;
}

interface LinksResponse {
  links: SharedLink[];
}

interface UseSharedLinksResult {
  links: SharedLink[];
  loading: boolean;

  loadLinks: () => Promise<void>;

  deleteLink: (linkToken: string) => Promise<void>;

  copyToClipboard: (text: string) => Promise<void>;

  clickLink: (link: string, fileName: string) => void;
}

export function useSharedLinks(): UseSharedLinksResult {
  const [links, setLinks] = useState<SharedLink[]>([]);

  const [loading, setLoading] = useState(true);

  const toast = useToast();

  const showToast = useCallback(
    (title: string, status: ToastStatus): void => {
      toast({
        title,
        status,
        duration: 2500,
        isClosable: true,
      });
    },
    [toast],
  );

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------

  const loadLinks = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      const data = await apiClient.get<LinksResponse>("/api/links");

      setLinks(data.links ?? []);
    } catch (error: unknown) {
      console.error("Error loading links:", error);

      showToast("Error loading shared links", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const deleteLink = useCallback(
    async (linkToken: string): Promise<void> => {
      try {
        await apiClient.post("/api/stop-sharing", {
          token: linkToken,
        });

        setLinks((previous) =>
          previous.filter((link) => link.token !== linkToken),
        );

        showToast("Link deleted", "success");
      } catch (error: unknown) {
        console.error("Error deleting link:", error);

        showToast("Error deleting link", "error");
      }
    },
    [showToast],
  );

  // ---------------------------------------------------------------------------
  // Clipboard
  // ---------------------------------------------------------------------------

  const copyToClipboard = useCallback(
    async (text: string): Promise<void> => {
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
      } catch (error: unknown) {
        console.error("Failed to copy to clipboard:", error);

        showToast("Failed to copy link", "error");
      }
    },
    [showToast],
  );

  // ---------------------------------------------------------------------------
  // Download
  // ---------------------------------------------------------------------------

  const clickLink = useCallback(
    (link: string, fileName: string): void => {
      try {
        const anchor = document.createElement("a");

        anchor.href = link;
        anchor.download = fileName;

        document.body.appendChild(anchor);

        anchor.click();
        anchor.remove();
      } catch (error: unknown) {
        console.error("Download error:", error);

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
