const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

const showToast = (toast, title, status) => {
  toast({ title, status, duration: 3000, isClosable: true });
};

// ---------------------------------------------------------------------------
// Save server
// ---------------------------------------------------------------------------

/**
 * Saves a new SFTP server configuration.
 * Handles both password and key-based auth — passes only the relevant
 * credential fields based on authType.
 */
export const SaveServer = async ({
  host,
  username,
  authType,
  keyMode,
  password,
  key,
  passphrase,
  toast,
}) => {
  try {
    const body = {
      host,
      username,
      authType,
    };

    if (authType === "password") {
      body.password = password;
    }

    if (authType === "key") {
      body.keyMode = keyMode;

      if (keyMode === "import") {
        body.key = key;

        if (passphrase) {
          body.passphrase = passphrase;
        }
      }
    }

    const response = await fetch("/sftp/api/save-server", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      showToast(toast, "Error adding server", "error");
      return null;
    }

    const data = await response.json();

    showToast(toast, "Server created", "success");

    return data;
  } catch (err) {
    console.error("SaveServer error:", err);
    showToast(toast, "Error adding server", "error");
    return null;
  }
};



// ---------------------------------------------------------------------------
// Delete server
// ---------------------------------------------------------------------------

/**
 * Deletes an SFTP server configuration by ID.
 */
export const DeleteServer = async ({ serverId, toast }) => {
  try {
    const response = await fetch("/sftp/api/delete-server", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ serverId }),
    });

    if (!response.ok) {
      showToast(toast, "Error deleting server", "error");
      return;
    }

    showToast(toast, "Server deleted", "success");
  } catch (err) {
    console.error("DeleteServer error:", err);
    showToast(toast, "Error deleting server", "error");
  }
};

// ---------------------------------------------------------------------------
// Fetch server statuses
// ---------------------------------------------------------------------------

/**
 * Fetches online/offline status for all servers concurrently.
 * Each status is set independently as it resolves so the UI
 * updates progressively rather than waiting for the slowest server.
 */
export const fetchServerStatuses = async ({ data, setServerStatuses }) => {
  await Promise.all(
    data.servers.map(async (server) => {
      try {
        const response = await fetch(`/sftp/server-status/${server._id}`);

        if (!response.ok) throw new Error("Failed to fetch status");

        const json = await response.json();
        setServerStatuses((prev) => ({ ...prev, [server._id]: json.status }));
      } catch (err) {
        console.error(`Status check failed for server ${server._id}:`, err);
        setServerStatuses((prev) => ({ ...prev, [server._id]: "offline" }));
      }
    }),
  );
};
