import React, { useState, useRef } from "react";
import {
  Box,
  Button,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  HStack,
  Center,
} from "@chakra-ui/react";

const TabPanelComp = ({
    tabs,
    activeTabIndex,
    setActiveTabIndex,
    closeTab
}) => {
  return (
    <Tabs
      index={activeTabIndex}
      onChange={(i) => setActiveTabIndex(i)}
      isLazy
      lazyBehavior="keepMounted"
    >
      <TabList>
        {tabs.length > 0 ? (
          tabs.map((tab) => (
            <HStack spacing={2}>
              <Tab key={tab.id}>{tab.label}</Tab>
              <Button
                size="xs"
                colorScheme="red"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                ✕
              </Button>
            </HStack>
          ))
        ) : (
          <Text color="gray.500" fontSize="lg">
            No open tabs. Select a server to begin.
          </Text>
        )}
      </TabList>
      <TabPanels>
        {tabs.length > 0 ? (
          tabs.map((tab) => (
            <TabPanel p={{ base: 1, md: 4 }} key={tab.id}>
              {tab.content}
            </TabPanel>
          ))
        ) : (
          <Center height="300px">
            <Box textAlign="center">
              <Text fontSize="lg" color="gray.500">
                No tabs open. Please select a server from the list to start.
              </Text>
            </Box>
          </Center>
        )}
      </TabPanels>
    </Tabs>
  );
};

export default TabPanelComp;
