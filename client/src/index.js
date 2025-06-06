import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ChakraProvider,extendTheme, ColorModeScript } from '@chakra-ui/react'
import reportWebVitals from './reportWebVitals';
import { ClipboardProvider } from './contexts/ClipboardContext';
const root = ReactDOM.createRoot(document.getElementById('root'));
const config = {
  initialColorMode: 'light', 
  useSystemColorMode: false, 
};
const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  styles: {
    global: (props) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.800' : 'gray.50',
        color: props.colorMode === 'dark' ? 'white' : 'black',
      },
    }),
  },
});
root.render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <ClipboardProvider>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <App />
      </ClipboardProvider>
    </ChakraProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
