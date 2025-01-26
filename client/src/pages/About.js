import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Heading,
  Text,
  Center,
  VStack,
  Spinner,
  Table,
  Tab,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";

const About = () => {
  const [stats, setStats] = useState([]);
  const token = localStorage.getItem("token");
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const response = await fetch("/api/pstats", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    setStats(data);
  };

  const formatUptime = () => {
    let up = stats.uptime;
    if (up < 60) {
      return `${up} seconds`;
    } else if (up < 3600) {
      return `${(up / 60).toFixed(2)} minutes`;
    } else {
      return `${(up / 60 / 60).toFixed(2)} hours`;
    }
  };

  return (
    <Box paddingTop={8}>
      <Center>
        <VStack>
          <Box>
            <Link to="/app/files">
              <Button colorScheme="blue" mb={6} size="lg" variant="outline">
                File Manager
              </Button>
            </Link>
          </Box>
          <Heading mb={5}>Uploady</Heading>
          <Text>v 1.01</Text>

          <Heading size="md">Server Info</Heading>
          {stats.memory ? (
            <Box>
              <Text>
                Total Memory: {(stats.memory.rss / 1000 / 1000).toFixed(2)} MB
              </Text>
              <Text>
                Heap Size: {(stats.memory.heapTotal / 1000 / 1000).toFixed(2)}{" "}
                MB
              </Text>
              <Text>
                Heap Used: {(stats.memory.heapUsed / 1000 / 1000).toFixed(2)} MB
              </Text>
              <Text>
                External: {(stats.memory.external / 1000 / 1000).toFixed(2)} MB
              </Text>
              <Text>
                ArrayBuffers:{" "}
                {(stats.memory.arrayBuffers / 1000 / 1000).toFixed(2)} MB
              </Text>
              <Text>Node version: {stats.nodeVersion}</Text>
              <Text>V8 version: {stats.v8Version}</Text>
              <Text>
                OS: {stats.osName} {stats.osRelease}
              </Text>
              <Text>Uptime: {formatUptime()}</Text>
            </Box>
          ) : ( 
            <Box textAlign="center" py={10}>
              <Spinner size="lg" />
              <Text mt={2}>Loading...</Text>
            </Box>
          )}

          <Link to="https://github.com/JimMatthew/uploady">
            <Text fontWeight="semibold" color={"blue.600"}>
              Go to Github
            </Text>
          </Link>
        </VStack>
      </Center>
    </Box>
  );
};

export default About;
