import type { Dispatch, SetStateAction } from "react";
import apiClient, { ApiError } from "../services/apiClient";
import type { AppToast } from "../hooks/useAppToast";

import type {
  DeleteServerRequest,
  DeleteServerResponse,
  ListServersResponse,
  SaveServerRequest,
  SaveServerResponse,
  ServerStatusResponse,
} from "../../../shared/api/server";

import type { ServerStatuses } from "../types/server";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type SaveServerParams = SaveServerRequest & {
  toast: AppToast;
};

interface FetchServerStatusesParams {
  data: ListServersResponse;
  setServerStatuses: Dispatch<SetStateAction<ServerStatuses>>;
}

interface DeleteServerParams {
  serverId: string;
  toast: AppToast;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const showToast = (
  toast: AppToast,
  title: string,
  status: "success" | "error",
): void => {
  toast({
    title,
    status,
    duration: 3000,
  });
};

// -----------------------------------------------------------------------------
// Save server
// -----------------------------------------------------------------------------

export const SaveServer = async (
  params: SaveServerParams,
): Promise<SaveServerResponse | null> => {
  const { toast, ...request } = params;

  try {
    const data = await apiClient.post<SaveServerResponse>(
      "/sftp/api/save-server",
      request,
    );

    showToast(toast, "Server created", "success");

    return data;
  } catch (error: unknown) {
    console.error("saveServer error:", error);

    const message =
      error instanceof ApiError
        ? error.message
        : "Error adding server";

    showToast(toast, message, "error");

    return null;
  }
};

// -----------------------------------------------------------------------------
// Delete server
// -----------------------------------------------------------------------------

export const DeleteServer = async ({
  serverId,
  toast,
}: DeleteServerParams): Promise<boolean> => {
  const request: DeleteServerRequest = {
    serverId,
  };

  try {
    await apiClient.post<DeleteServerResponse>(
      "/sftp/api/delete-server",
      request,
    );

    showToast(toast, "Server deleted", "success");

    return true;
  } catch (error: unknown) {
    console.error("DeleteServer error:", error);

    const message =
      error instanceof ApiError
        ? error.message
        : "Error deleting server";

    showToast(toast, message, "error");

    return false;
  }
};

// -----------------------------------------------------------------------------
// Fetch server statuses
// -----------------------------------------------------------------------------

export const fetchServerStatuses = async ({
  data,
  setServerStatuses,
}: FetchServerStatusesParams): Promise<void> => {
  await Promise.all(
    data.servers.map(async (server) => {
      try {
        const result = await apiClient.get<ServerStatusResponse>(
          `/sftp/server-status/${server._id}`,
        );

        setServerStatuses((previous) => ({
          ...previous,
          [server._id]: result.status,
        }));
      } catch (error: unknown) {
        console.error(
          `Status check failed for server ${server._id}:`,
          error,
        );

        setServerStatuses((previous) => ({
          ...previous,
          [server._id]: "offline",
        }));
      }
    }),
  );
};