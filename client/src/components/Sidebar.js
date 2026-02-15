import React, { useState, useRef } from "react";
import {
  Box,
  Button,
  VStack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import ServerCard from "../components/ServerCard";
const Sidebar = ({
  handleConnect,
  handleLocalTab,
  handleNewServer,
  handleSshLaunch,
  handleSharedLinks,
  deleteServer,
  setShowSidebar,
  isDesktop,
  sftpServers,
  serverStatuses
}) => {
  const bgg = useColorModeValue("gray.50", "gray.800");
  
  return (
    <Box
      width={`260px`}
      bg={bgg}
      p={4}
      borderRight="1px solid"
      borderColor="gray.200"
      minHeight="100vh"
      maxHeight="100vh"
      overflowY="auto"
      position={{ base: "absolute", lg: "relative" }}
      zIndex={{ base: 10, lg: 1 }}
      top={0}
      left={0}
      transition="all 0.1s ease"
      sx={{
        /* For Webkit browsers (Chrome, Edge, Safari) */
        "::-webkit-scrollbar": {
          width: "6px",
        },
        "::-webkit-scrollbar-thumb": {
          background: "rgba(100, 100, 100, 0.3)",
          borderRadius: "3px",
        },
        "::-webkit-scrollbar-thumb:hover": {
          background: "rgba(100, 100, 100, 0.5)",
        },
        "::-webkit-scrollbar-track": {
          background: "transparent",
        },
        /* For Firefox */
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(100, 100, 100, 0.3) transparent",
      }}
    >
      <VStack spacing={4} align="stretch">
        <Box>
          {!isDesktop && (
            <Button
              mt={4}
              mb={4}
              colorScheme="red"
              onClick={() => setShowSidebar(false)}
            >
              Close Sidebar
            </Button>
          )}
          <Link to="/app/files">
            <Button marginBottom={"10px"} colorScheme="teal" width="100%">
              Go to Files
            </Button>
          </Link>

          <Button
            marginBottom={"10px"}
            colorScheme="blue"
            width="100%"
            onClick={() => handleNewServer()}
          >
            Add New Server
          </Button>
          <Button
            marginBottom={"10px"}
            colorScheme="blue"
            width="100%"
            onClick={() => handleLocalTab()}
          >
            Local
          </Button>
          <Button
            colorScheme="blue"
            width="100%"
            onClick={() => handleSharedLinks()}
          >
            Links
          </Button>
        </Box>
        {sftpServers.servers.length > 0 ? (
          sftpServers.servers.map((server) => (
            <ServerCard
              key={server._id}
              serverId={server._id}
              serverName={server.host}
              serverStatuses={serverStatuses}
              handleConnect={() => handleConnect(server)}
              handleSshLaunch={() => handleSshLaunch(server)}
              deleteServer={() => deleteServer(server._id)}
            />
          ))
        ) : (
          <Text color="gray.500">No servers available.</Text>
        )}
      </VStack>

      {!isDesktop && (
        <Button mt={4} colorScheme="red" onClick={() => setShowSidebar(false)}>
          Close Sidebar
        </Button>
      )}
    </Box>
  );
};

export default Sidebar