import React from 'react';
import { useColorMode, Button } from '@chakra-ui/react';

const DarkModeToggle = () => {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <Button margin={"2px"} onClick={toggleColorMode} colorScheme="blue" >
      {colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}
    </Button>
  );
};

export default DarkModeToggle;