import React, { useState } from 'react';
import {
    Button,
    Input,
  } from "@chakra-ui/react";
const CreateFolder = ({ onFolderCreated, currentPath }) => {
  const [folderName, setFolderName] = useState('');

  // Handle input change
  const handleInputChange = (e) => {
    setFolderName(e.target.value);
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (folderName.trim() === '') {
      alert('Please enter a valid folder name');
      return;
    }

    try {
      const response = await fetch('/api/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`, 
        },
        body: JSON.stringify({ folderName, currentPath }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Folder created successfully');
        onFolderCreated(); // Refresh the folder list or trigger an update
      } else {
        alert(data.message || 'Error creating folder');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create folder');
    }

    // Clear the input after submission
    setFolderName('');
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <Input
            size='sm'
          type="text"
          placeholder="Enter folder name"
          value={folderName}
          onChange={handleInputChange}
        />
        <Button size='sm' type="submit">Create Folder</Button>
      </form>
    </div>
  );
};

export default CreateFolder;