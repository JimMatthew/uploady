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
 * Creates a new SFTP server configuration.
 *
 * Only credential fields relevant to the selected authentication
 * method are included in the request.
 *
 * @param {Object} params
 * @param {string} params.host
 * @param {string} params.username
 * @param {"password"|"key"} params.authType
 * @param {"saved"|"import"} [params.keyMode]
 * @param {string} [params.keyId]
 * @param {string} [params.password]
 * @param {string} [params.key]
 * @param {string} [params.passphrase]
 * @param {Function} params.toast
 *
 * @returns {Promise<Object|null>} Created server data, or null on failure
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
  const payload = {
    host,
    username,
    authType,
  };

  if (authType === "password") {
    payload.password = password;
  }

  if (authType === "key") {
    payload.keyMode = keyMode;

    if (keyMode === "saved") {
      payload.keyId = keyId;
    }

    if (keyMode === "import") {
      payload.key = key;

      if (passphrase) {
        payload.passphrase = passphrase;
      }
    }
  }

  try {
    const data = await apiClient.post("/sftp/api/save-server", payload);

    showToast(toast, "Server created", "success");

    return data;
  } catch (err) {
    console.error("saveServer error:", err);
    showToast(toast, err?.message || "Error adding server", "error");
    return null;
  }
};

// ---------------------------------------------------------------------------
// Delete server
// ---------------------------------------------------------------------------

/**
 * Deletes an SFTP server configuration by ID.
 *
 * @param {Object} params
 * @param {string} params.serverId
 * @param {Function} params.toast
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
 * Fetches online/offline status for all configured servers concurrently.
 *
 * Each server updates independently as its request completes, allowing
 * the UI to update progressively instead of waiting for the entire
 * status batch to finish.
 *
 * @param {Object} params
 * @param {{ servers?: Array<Object> }} params.data
 * @param {Function} params.setServerStatuses
 *
 * @returns {Promise<void>}
 */
export const fetchServerStatuses = async ({ data, setServerStatuses }) => {
  await Promise.all(
    data.servers.map(async (server) => {
      try {
        const result = await apiClient.get(`/sftp/server-status/${server._id}`);

        setServerStatuses((prev) => ({
          ...prev,
          [server._id]: result.status,
        }));
      } catch (err) {
        console.error(`Status check failed for server ${server._id}:`, err);

        setServerStatuses((prev) => ({
          ...prev,
          [server._id]: "offline",
        }));
      }
    }),
  );
};
