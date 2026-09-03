import apiClient from "../services/apiClient";

const showToast = (toast, title, status) => {
  toast({
    title,
    status,
    duration: 3000,
    isClosable: true,
  });
};

// ---------------------------------------------------------------------------
// Save server
// ---------------------------------------------------------------------------

/**
 * Saves a new SFTP server configuration.
 *
 * Only credential fields relevant to the selected authentication
 * method are included in the request.
 *
 * @returns {Promise<Object|null>} Created server data, or null on failure.
 */
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
}) => {
  try {
    const data = await apiClient.post("/sftp/api/save-server", {
      host,
      username,
      authType,
      keyMode,

      password:
        authType === "password"
          ? password
          : undefined,

      keyId:
        authType === "key" && keyMode === "saved"
          ? keyId
          : undefined,

      key:
        authType === "key" && keyMode === "import"
          ? key
          : undefined,

      passphrase:
        authType === "key" && keyMode === "import"
          ? passphrase || undefined
          : undefined,
    });

    showToast(toast, "Server created", "success");

    return data;
  } catch (err) {
    console.error("SaveServer error:", err);
    showToast(
      toast,
      err.message || "Error adding server",
      "error",
    );

    return null;
  }
};

// ---------------------------------------------------------------------------
// Delete server
// ---------------------------------------------------------------------------

/**
 * Deletes an SFTP server configuration by ID.
 *
 * @returns {Promise<boolean>} True when deletion succeeds.
 */
export const DeleteServer = async ({ serverId, toast }) => {
  try {
    await apiClient.post("/sftp/api/delete-server", {
      serverId,
    });

    showToast(toast, "Server deleted", "success");

    return true;
  } catch (err) {
    console.error("DeleteServer error:", err);
    showToast(toast, err.message || "Error deleting server", "error");

    return false;
  }
};

// ---------------------------------------------------------------------------
// Fetch server statuses
// ---------------------------------------------------------------------------

/**
 * Fetches online/offline status for all servers concurrently.
 *
 * Each server updates independently as its request completes,
 * allowing the UI to update progressively instead of waiting
 * for every status request to finish.
 */
export const fetchServerStatuses = async ({
  data,
  setServerStatuses,
}) => {
  await Promise.all(
    data.servers.map(async (server) => {
      try {
        const result = await apiClient.get(
          `/sftp/server-status/${server._id}`,
        );

        setServerStatuses((prev) => ({
          ...prev,
          [server._id]: result.status,
        }));
      } catch (err) {
        console.error(
          `Status check failed for server ${server._id}:`,
          err,
        );

        setServerStatuses((prev) => ({
          ...prev,
          [server._id]: "offline",
        }));
      }
    }),
  );
};