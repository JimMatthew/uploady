export const SaveServer = async ({
  host,
  username,
  password,
  authMethod,
  toast,
}) => {
  const response = await fetch("/sftp/api/save-server", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({
      host: host,
      username: username,
      authType: authMethod,
      password: authMethod === "password" ? password : undefined,
      key: authMethod === "key" ? password : undefined,
    }),
  });
  if (!response.ok) {
    toast({
      title: "Error Adding Server",
      status: "error",
      duration: 3000,
      isClosable: true,
    });
  }
  toast({
    title: "Server created",
    status: "success",
    duration: 3000,
    isClosable: true,
  });
};

export const DeleteServer = async ({ serverId, toast }) => {
  const response = await fetch("/sftp/api/delete-server", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ serverId }),
  });
  if (!response.ok) {
    toast({
      title: "Error Deleting Server",
      status: "error",
      duration: 3000,
      isClosable: true,
    });
  }
  toast({
    title: "Server Deleted",
    status: "success",
    duration: 3000,
    isClosable: true,
  });
};

export const fetchServerStatuses = async ({ data, setServerStatuses }) => {
  data.servers.forEach(async (server) => {
    try {
      const response = await fetch(`/sftp/server-status/${server._id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch");
      }
      const json = await response.json();
      setServerStatuses((prev) => ({
        ...prev,
        [server._id]: json.status,
      }));
    } catch (error) {
      setServerStatuses((prev) => ({
        ...prev,
        [server._id]: "Error fetching status",
      }));
    }
  });
};
