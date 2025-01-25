
import "./App.css";
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, } from "react-router-dom";
import { useToast } from "@chakra-ui/react";
import Login from "./pages/Login";
import FileList from "./pages/FileList";
import AppLayout from "./AppLayout";
import SftpList from "./pages/SftpList"
import About from "./pages/About"
const App = () => {
  const [user, setuser] = useState(null);
  const toast = useToast();
  let vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
  return (
    <Router>
      <AppLayout username={user}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/app/files" element={<FileList setUser={setuser} toast={toast}/>} />
          <Route path="/api/sftp" element={<SftpList toast={toast}/>} />
          <Route path="/about" element={<About/>}/>
        </Routes>
      </AppLayout>
    </Router>
  );
};

export default App;
