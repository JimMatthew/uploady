import "./App.css";
import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import AppLayout from "./AppLayout";
import Workspace from "./pages/Workspace";
import About from "./pages/About";
import useAppToast from "./hooks/useAppToast";
import Setup from "./pages/Setup";
import SshPopout from "./pages/SshPopout";
const App = () => {
  const toast = useAppToast();

  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`,
      );
    };
    setVh();
    window.addEventListener("resize", setVh);
    return () => window.removeEventListener("resize", setVh);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/ssh-popout" element={<SshPopout />} />

        <Route
          path="*"
          element={
            <AppLayout>
              <Routes>
                <Route path="/setup" element={<Setup />} />
                <Route path="/" element={<Login />} />
                <Route path="/sftp" element={<Workspace toast={toast} />} />
                <Route path="/about" element={<About />} />
              </Routes>
            </AppLayout>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
