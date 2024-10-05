import logo from './logo.svg';
import './App.css';
import React, {useState} from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import FileList from './pages/FileList'
import { Button, Box } from "@chakra-ui/react";
import SFTPServerList from './pages/SftpServerList';
import Footer from './pages/Footer';
const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/api/files" element={<FileList />} />
        <Route path="/api/sftp" element={<SFTPServerList />}/>
      </Routes>
      <Footer />
    </Router>
  )
}

export default App;
