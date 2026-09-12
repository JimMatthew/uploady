import type { ReactNode } from "react";
import { Box, Flex } from "@chakra-ui/react";
import { Global } from "@emotion/react";

import Footer from "./components/Footer";
import Header from "./components/Header";

interface AppLayoutProps {
  children: ReactNode;
}

const GlobalStyles = () => (
  <Global
    styles={`
      html, body, #root {
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
    `}
  />
);

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <Flex h="100dvh" direction="column" overflow="hidden">
      <GlobalStyles />

      <Header />

      <Box flex={1} overflow="hidden">
        {children}
      </Box>

      <Footer />
    </Flex>
  );
};

export default AppLayout;
