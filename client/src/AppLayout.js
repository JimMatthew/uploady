import { Box, Flex } from "@chakra-ui/react";
import Footer from "./components/Footer";
import Header from "./components/Header";
import { Global } from "@emotion/react";
const AppLayout = ({ children, username }) => {
  return (
    <Flex direction="column" minHeight="100vh">
      <GlobalStyles />
      <Header username={username} />
      <Box flex="1">
        {children}
      </Box>
      <Footer />
    </Flex>
  );
};

const GlobalStyles = () => (
  <Global
    styles={`
      body {
        overflow-y: scroll; /* Always show the scrollbar */
      }
    `}
  />
);

export default AppLayout;
