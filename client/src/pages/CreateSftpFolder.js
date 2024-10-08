import React, { useState } from "react";
import { Button, Input } from "@chakra-ui/react";
const CreateSftpFolder = ({
  onFolderCreated,
  serverId,
     sftpCreateFolderOnSubmit,
  currentDirectory,
  toast,
}) => {
  const [folderName, setFolderName] = useState("");
  const cd = currentDirectory ? currentDirectory : "/";
  const handleInputChange = (e) => {
    setFolderName(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (folderName.trim() === "") {
      alert("Please enter a valid folder name");
      return;
    }

    sftpCreateFolderOnSubmit(folderName)
    return
    const response = await fetch("/sftp/api/create-folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
            currentPath: cd,
            serverId: serverId,
            folderName: folderName,
        }),
      });
      if (!response.ok) {
        toast({
          title: "Error Creating Folder",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
      onFolderCreated(cd);
      toast({
        title: "Foldery Created.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

    //setFolderName("");
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <Input
          size="sm"
          type="text"
          placeholder="Enter folder name"
          value={folderName}
          onChange={handleInputChange}
        />
        <Button size="sm" type="submit">
          Create Folder
        </Button>
      </form>
    </div>
  );
};

export default CreateSftpFolder;
