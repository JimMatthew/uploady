import { Box, Flex } from "@chakra-ui/react";
import Footer from './pages/Footer';
import Header from './pages/Header';

const AppLayout = ({ children, username }) => {
  return (
    <Flex direction="column" minHeight="100vh">
      <Header username={username} />
      <Box flex="1" p={5}> {/* This box will take up available space */}
        {children}
      </Box>
      <Footer />
    </Flex>
  );
};

export default AppLayout;