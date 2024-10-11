import { Box, Flex } from "@chakra-ui/react";
import Footer from './pages/Footer';
import Header from './pages/Header';

const AppLayout = ({ children, username }) => {
  return (
    
    <Flex direction="column" minHeight="100vh">
      <GlobalStyles />
      <Header username={username} />
      <Box flex="1" > {/* This box will take up available space */}
        {children}
      </Box>
      <Footer />
    </Flex>
  );
};

import { Global } from "@emotion/react";

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
