import { Box, Flex } from "@chakra-ui/react";
import Footer from "./components/Footer";
import Header from "./components/Header";
import { Global } from "@emotion/react";

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

const AppLayout = ({ children }) => {
  return (
    <Flex h="100vh" direction="column" overflow="hidden">
      <GlobalStyles />
      <Header flexShrink={0} />
      <Box flex={1} overflow="hidden">
        {children}
      </Box>
      <Footer flexShrink={0} />
    </Flex>
  );
};

export default AppLayout;