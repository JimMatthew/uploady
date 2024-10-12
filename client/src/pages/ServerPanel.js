import { useState } from "react"
import { Tabs, TabList, TabPanels, Tab, TabPanel, Box, Button, VStack } from "@chakra-ui/react"
import SftpFileFolderView from "./SftpFileFolderView"
import SSHConsole from "./SshConsole"

const ServerPanel = ({ sftpServers, handleConnect, handleDelete, handleSSH }) => {
  const [tabs, setTabs] = useState([])

  const addTab = (server, type) => {
    const newTab = {
      id: `${server._id}-${type}`,
      label: `${server.name} - ${type}`,
      content: type === "SFTP" ? <SftpFileFolderView server={server} /> : <SSHConsole server={server} />,
    }
    setTabs((prevTabs) => [...prevTabs, newTab])
  }

  return (
    <Box>
      <VStack spacing={4}>
        {sftpServers.servers.map((server) => (
          <Box key={server._id}>
            <Button onClick={() => addTab(server, "SFTP")}>Open SFTP</Button>
            <Button onClick={() => addTab(server, "SSH")}>Open SSH</Button>
          </Box>
        ))}
      </VStack>

      <Tabs>
        <TabList>
          {tabs.map((tab) => (
            <Tab key={tab.id}>{tab.label}</Tab>
          ))}
        </TabList>

        <TabPanels>
          {tabs.map((tab) => (
            <TabPanel key={tab.id}>{tab.content}</TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </Box>
  )
}

export default ServerPanel