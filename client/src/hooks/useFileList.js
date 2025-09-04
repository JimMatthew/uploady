import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
export function useFileList() {
  const [fileData, setFileData] = useState(null);
  const [currentPath, setCurrentPath] = useState("files");
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      setLoading(true);
      fetchFiles(currentPath);
      setLoading(false);
    } else {
      navigate("/");
      console.error("No token found");
    }
  }, [currentPath, token]);

  const handleFolderClick = (folderName) => {
    setCurrentPath((prevPath) => `${prevPath}/${folderName}`);
  };

  const reload = () => {
    fetchLinks();
    fetchFiles(currentPath);
  };

  const fetchLinks = () => {
    fetch("/api/links", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setLinks(data.links);
      })
      .catch((err) => {
        console.error("Error fetching shared links", err);
      });
  };

  const fetchFiles = async (path) => {
    try {
      const response = await fetch(`/api/${path}/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status !== 200) {
        navigate("/");
        return;
      }
      const data = await response.json();
      setFileData(data);
    } catch (err) {
      console.error("Error fetching files:", err);
    } 
  };
  return {
    fileData,
    setCurrentPath,
    loading,
    links,
    handleFolderClick,
    reload,
    fetchLinks,
  };
}
