import { useCallback, useState } from "react";

import apiClient from "../services/apiClient";
import useAppToast from "./useAppToast";

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

  const toast = useAppToast();

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

      toast({
        title: "Error loading shared links",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

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

        toast({
          title: "Link deleted",
          status: "success",
        });
      } catch (error: unknown) {
        console.error("Error deleting link:", error);

        toast({
          title: "Error deleting link",
          status: "error",
        });
      }
    },
    [toast],
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

        toast({
          title: "Link copied!",
          status: "success",
        });
      } catch (error: unknown) {
        console.error("Failed to copy to clipboard:", error);

        toast({
          title: "Failed to copy link",
          status: "error",
        });
      }
    },
    [toast],
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

        toast({
          title: "Error downloading file",
          status: "error",
        });
      }
    },
    [toast],
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
