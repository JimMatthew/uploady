const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const SharedFile = require("../models/SharedFile");
require('dotenv').config();
module.exports = () => {
  const uploadsDir = path.join(__dirname, "../uploads");
  const tempdir = path.join(__dirname, "../temp");
  const domain = process.env.HOSTNAME;

  /*
    upload files to directory
    We upload to temp folder and rename to desired directory
  */
  const upload_files_post = (req, res, next) => {
    const folderPath = req.body.folderPath || ""; // Default to root if no folder is provided
    const targetFolder = path.join(uploadsDir, folderPath);
    const files = req.files;

    if (!fs.existsSync(targetFolder)) {
      const err = new Error("Folder does not exist");
      err.status = 404;
      return next(err);
    }

    if (!files) {
      const err = new Error("No File Uploaded");
      err.status = 404;
      return next(err);
    }

    files.forEach((file) => {
      const targetPath = path.join(targetFolder, file.originalname);
      const currPath = path.join(tempdir, file.originalname);

      fs.rename(currPath, targetPath, (err) => {
        if (err) {
          throw err;
        }
      });
    });
    res.redirect(`/files/${folderPath}`);
  };

  /*
    Generate a public link for a file that can be access publicly
    the url will be /share/xxxxx/file.foo where xxxxx is a random
  */
  const generateShareLinkJsonPost = async (req, res, next) => {
    const relativeFilePath = req.body.filePath || ""; // Pass full relative path from client
    const fileName = req.body.fileName;
    const absoluteFilePath = path.join(uploadsDir, relativeFilePath, fileName);

    if (!fs.existsSync(absoluteFilePath)) {
      return res.status(400).json({
        error: "File not found",
      });
    }
    const relPathName = path.join(relativeFilePath, fileName);
    const token = crypto.randomBytes(5).toString("hex"); // Generate random token
    const shareLink = `${req.protocol}://${domain}/share/${token}/${fileName}`;

    if (!(await storeLinkInfo(fileName, relPathName, shareLink, token))) {
      return res.status(400).json({
        error: 'This File is already shared"',
      });
    }
    res.json({
      link: shareLink,
      fileName: fileName,
    });
  };

  /*
    Server a shared file. 
    We use the token to lookup the shared file 
  */
  const serveSharedFile = async (req, res) => {
    const { token, filename } = req.params; // Extract token and file name from the URL
    const filePath = await getFilePathFromStorageToken(token);
    if (!filePath) {
      return res.status(404).send("Shared link not found");
    }

    const absoluteFilePath = path.join(path.dirname(filePath), filename);
    if (!fs.existsSync(absoluteFilePath)) {
      return res.status(404).send("File not found");
    }

    res.download(absoluteFilePath, filename, (err) => {
      if (err) {
        return res.status(500).send("Error downloading file");
      }
    });
  };

  const getFilePathFromStorageToken = async (token) => {
    const sharedFile = await SharedFile.findOne({ token });
    return sharedFile ? path.join(uploadsDir, sharedFile.filePath) : null;
  };

  const delete_folder_json_post = (req, res, next) => {
    const relativePath = req.body.folderPath || ""; // Path relative to the uploads directory
    const folderName = req.body.folderName || "";
    const folderPath = path.join(uploadsDir, relativePath, folderName);
    console.log("del fo: " + folderPath);

    fs.rmdir(folderPath, (err) => {
      if (err) {
        const err = new Error("Error deleting folder");
        err.status = 404;
        return next(err);
      }
    });
    res.status(200).json({
      message: "file deleted",
    });
  };

  const generateBreadcrumbs = (relativePath) => {
    const breadcrumbs = [];
    let currentPath = ""; // Start from the root (/files)
    const pathParts = relativePath.split("/").filter(Boolean);

    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      breadcrumbs.push({
        name: part,
        path: currentPath,
      });
    });
    breadcrumbs.unshift({ name: "Home", path: "/files" });

    return breadcrumbs;
  };

  const getDirectoryData = (relativePath) => {
    const currentPath = relativePath ? `/files/${relativePath}` : "/files";
    const { files, folders } = getDirectoryContents_get(
      path.join(uploadsDir, relativePath)
    );
    const breadcrumb = generateBreadcrumbs(currentPath);

    return { files, folders, breadcrumb, currentPath, relativePath };
  };

  /*
    Renders the main file manager display, listing files and folders in 
    current path
  */

  const list_directory_json_get = (req, res) => {
    const relativePath = req.params[0] || "";
    try {
      const data = getDirectoryData(relativePath);
      res.json({ ...data, user: req.user });
    } catch (error) {
      res.status(500).json({
        error: "Failed to list directory contents",
        message: error.message,
      });
    }
  };

  /*
    Obtains the file and folder info for dirPath
    and returns the info in an array of properties
  */
  const getDirectoryContents_get = (dirPath) => {
    const contents = fs.readdirSync(dirPath);
    const files = [];
    const folders = [];

    contents.forEach((item) => {
      const itemPath = path.join(dirPath, item);
      const stats = fs.lstatSync(itemPath);

      if (stats.isDirectory()) {
        folders.push({ name: item }); // Only push the name for folders
      } else if (stats.isFile()) {
        files.push({
          name: item, // File name
          size: (stats.size / 1024).toFixed(2), // Size in KB
          date: stats.mtime.toLocaleDateString(), // Last modified date
        });
      }
    });

    return { files, folders };
  };

  const file_links_json_get = async (req, res) => {
    const links = await SharedFile.find();
    res.json({ links });
  };

  /*
    Store file info for shared file
    Save to configured storage 
  */
  const storeLinkInfo = async (fileName, filePath, link, token) => {
    const ff = await SharedFile.findOne({ fileName, filePath });
    if (ff) {
      return false;
    }

    const sharedFile = new SharedFile({
      fileName,
      filePath,
      link,
      token,
    });
    await sharedFile.save();
    return true;
  };

  const stop_sharing_json_post = async (req, res) => {
    const token = req.body.token;
    await SharedFile.deleteOne({ token });
    res.status(200).json({
      message: "link deleted",
    });
  };

  const delete_file_jspn_post = async (req, res, next) => {
    const relativeFilePath = "/" + req.params[0];
    const filePath = path.join(uploadsDir, relativeFilePath);
    const fileName = path.basename(filePath);
    fs.unlink(filePath, (err) => {
      if (err) {
        res.status(400).json({
          message: "file deleted",
        });
        return;
      }
    });
    const fullPath = path.join(filePath, fileName);
    await SharedFile.findOneAndDelete({ filePath, fileName });
    res.status(200).json({
      message: "file deleted",
    });
  };

  const download_file_get = (req, res, next) => {
    const relativeFilePath = req.params[0];
    const filePath = path.join(uploadsDir, relativeFilePath);

    res.download(filePath, (err) => {
      if (err) {
        return next(err);
      }
    });
  };

  // Helper function to create a new folder
  const createFolder = (dirPath, folderName) => {
    const newFolderPath = path.join(dirPath, folderName);
    if (!fs.existsSync(newFolderPath)) {
      fs.mkdirSync(newFolderPath);
    } else {
      const err = new Error("Folder already exists");
      err.status = 404;
      return next(err);
    }
  };

  const create_folder_json_post = (req, res, next) => {
    const { folderName, currentPath } = req.body;
    try {
      const fullPath = path.join(uploadsDir, currentPath || "");
      console.log(fullPath);
      createFolder(fullPath, folderName);
      res.status(200).json({
        message: "file created",
      });
    } catch (err) {
      console.log(err);
      return next(err);
    }
  };

  return {
    download_file_get,
    upload_files_post,
    serveSharedFile,
    list_directory_json_get,
    file_links_json_get,
    generateShareLinkJsonPost,
    stop_sharing_json_post,
    delete_file_jspn_post,
    create_folder_json_post,
    delete_folder_json_post,
  };
};
