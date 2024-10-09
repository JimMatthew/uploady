import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Button,
  VStack,
  useBreakpointValue,
  Stack,
  CardBody,
  Card,
  Text,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  HStack,
} from "@chakra-ui/react";

const AddServer = ({ handleSaveServer }) => {
    const [newServerDetails, setNewServerDetails] = useState({ host: "", username: "", password: "" })

    const handleInputChange = (e) => {
        setNewServerDetails({ ...newServerDetails, [e.target.name]: e.target.value })
      }

      const handleSave = (e) => {
        e.preventDefault()
        
        handleSaveServer(newServerDetails.host, newServerDetails.username, newServerDetails.password)
      }

      return (
        <Box>
        {/* New Server Form */}
        <VStack as="form" spacing={4} onSubmit={handleSave}>
          <Input
            name="host"
            placeholder="Host"
            value={newServerDetails.host}
            onChange={handleInputChange}
          />
          <Input
            name="username"
            placeholder="Username"
            value={newServerDetails.username}
            onChange={handleInputChange}
          />
          <Input
            name="password"
            type="password"
            placeholder="Password"
            value={newServerDetails.password}
            onChange={handleInputChange}
          />
          <Button colorScheme="blue" type="submit">
            Save Server
          </Button>
        </VStack>
      </Box>
      )
}

export default AddServer