import { useEffect, useState } from "react";
import { Spinner, Center, Image } from "@chakra-ui/react";

async function fetchImage({ serverId, currentDirectory, filename, token }) {
  const url = serverId
    ? `/sftp/api/download/${serverId}/${currentDirectory}/${filename}`
    : `/api/download/${currentDirectory}/${filename}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch image");
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

const ImageViewer = ({ serverId, currentDirectory, filename, token }) => {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let objectUrl;
    fetchImage({ serverId, currentDirectory, filename, token })
      .then((url) => {
        objectUrl = url;
        setSrc(url);
      })
      .finally(() => setLoading(false));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl); // cleanup
    };
  }, [serverId, currentDirectory, filename, token]);

  if (loading) {
    return (
      <Center h="100%">
        <Spinner />
      </Center>
    );
  }

  return (
    <Center h="100%" bg="gray.800">
      <Image
        src={src}
        alt={filename}
        maxW="90%"
        maxH="90%"
         style={{
          maxWidth: "95%",
          maxHeight: "95%",
          objectFit: "scale-down", 
          borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
          display: loading ? "none" : "block",
        }}
      />
    </Center>
  );
};

export default ImageViewer;
