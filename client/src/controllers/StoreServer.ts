import apiClient, { ApiError } from "../services/apiClient";

import type { AppToast } from "../hooks/useAppToast";
import type { ServerStatus, ServerStatuses } from "../types/server";

type AuthType = "password" | "key";

type KeyMode = "saved" | "import" | "generate";

interface Server {
  _id: string;
}

interface ServerListData {
  servers: Server[];
}

interface SaveServerParams {
  host: string;
  username: string;
  authType: AuthType;
  keyMode?: KeyMode;
  keyId?: string;
  password?: string;
  key?: string;
  passphrase?: string;
  toast: AppToast;
}

interface PasswordServerPayload {
  host: string;
  username: string;
  authType: "password";
  password?: string;
}

interface SavedKeyServerPayload {
  host: string;
  username: string;
  authType: "key";
  keyMode: "saved";
  keyId?: string;
}

interface ImportedKeyServerPayload {
  host: string;
  username: string;
  authType: "key";
  keyMode: "import";
  key?: string;
  passphrase?: string;
}

interface GeneratedKeyServerPayload {
  host: string;
  username: string;
  authType: "key";
  keyMode: "generate";
}

type SaveServerPayload =
  | PasswordServerPayload
  | SavedKeyServerPayload
  | ImportedKeyServerPayload
  | GeneratedKeyServerPayload;

interface SavedServer {
  id: string;
  host: string;
  username: string;
  authType: AuthType;
  keyId?: string;
  publicKey?: string;
}

interface SaveServerResponse {
  message: string;
  server: SavedServer;
}

interface ServerStatusResponse {
  status: ServerStatus;
}

interface FetchServerStatusesParams {
  data: ServerListData;

  setServerStatuses: React.Dispatch<React.SetStateAction<ServerStatuses>>;
}

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

// ---------------------------------------------------------------------------
// Save server
// ---------------------------------------------------------------------------

interface SavedServer {
  id: string;
  host: string;
  username: string;
  authType: AuthType;
  keyId?: string;
  publicKey?: string;
}

interface SaveServerResponse {
  message: string;
  server: SavedServer;
}

export const SaveServer = async ({
  host,
  username,
  authType,
  keyMode,
  keyId,
  password,
  key,
  passphrase,
  toast,
}: SaveServerParams): Promise<SaveServerResponse | null> => {
  let payload: SaveServerPayload;

  if (authType === "password") {
    payload = {
      host,
      username,
      authType,
      password,
    };
  } else if (keyMode === "saved") {
    payload = {
      host,
      username,
      authType,
      keyMode,
      keyId,
    };
  } else if (keyMode === "import") {
    payload = {
      host,
      username,
      authType,
      keyMode,
      key,
      ...(passphrase ? { passphrase } : {}),
    };
  } else if (keyMode === "generate") {
    payload = {
      host,
      username,
      authType,
      keyMode,
    };
  } else {
    showToast(toast, "Invalid key configuration", "error");

    return null;
  }

  try {
    const data = await apiClient.post<SaveServerResponse>(
      "/sftp/api/save-server",
      payload,
    );

    showToast(toast, "Server created", "success");

    return data;
  } catch (error: unknown) {
    console.error("saveServer error:", error);

    const message =
      error instanceof ApiError ? error.message : "Error adding server";

    showToast(toast, message, "error");

    return null;
  }
};
// ---------------------------------------------------------------------------
// Delete server
// ---------------------------------------------------------------------------

interface DeleteServerParams {
  serverId: string;
  toast: AppToast;
}

export const DeleteServer = async ({
  serverId,
  toast,
}: DeleteServerParams): Promise<boolean> => {
  try {
    await apiClient.post("/sftp/api/delete-server", {
      serverId,
    });

    showToast(toast, "Server deleted", "success");

    return true;
  } catch (error: unknown) {
    console.error("DeleteServer error:", error);

    const message =
      error instanceof ApiError ? error.message : "Error deleting server";

    showToast(toast, message, "error");

    return false;
  }
};

// ---------------------------------------------------------------------------
// Fetch server statuses
// ---------------------------------------------------------------------------

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
        console.error(`Status check failed for server ${server._id}:`, error);

        setServerStatuses((previous) => ({
          ...previous,
          [server._id]: "offline",
        }));
      }
    }),
  );
};
