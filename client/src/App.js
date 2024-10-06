
import "./App.css";
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import FileList from "./pages/FileList";
import SFTPServerList from "./pages/SftpServerList";
import AppLayout from "./AppLayout";
import SftpList from "./pages/SftpList"
const App = () => {
  const [user, setuser] = useState(null);
  return (
    <Router>
      <AppLayout username={user}>
        <Routes>
          
          <Route path="/" element={<Login />} />
          <Route path="/app/files" element={<FileList setUser={setuser} />} />
          <Route path="/api/sftp" element={<SftpList />} />
          
         
        </Routes>
      </AppLayout>
    </Router>
  );
};

export default App;
