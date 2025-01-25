const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const SharedFile = require("../models/SharedFile");
require("dotenv").config();
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
      return next({ message: "Folder does not exist", status: 404 });
    }

    if (!files) {
      return next({ message: "No files uploaded", status: 400 });
    }

    files.forEach((file) => {
      const targetPath = path.join(targetFolder, file.originalname);
      const currPath = path.join(tempdir, file.originalname);

      fs.rename(currPath, targetPath, (err) => {
        if (err) {
          next({ message: "File upload failed", status: 500 });
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
      return next({ message: "File not found", status: 400 });
    }
    const relPathName = path.join(relativeFilePath, fileName);
    const token = crypto.randomBytes(5).toString("hex"); // Generate random token
    const shareLink = `${req.protocol}://${domain}/share/${token}/${fileName}`;

    if (!(await storeLinkInfo(fileName, relPathName, shareLink, token))) {
      return next({ message: "File is already shared", status: 400 });
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
  const serveSharedFile = async (req, res, next) => {
    const { token, filename } = req.params; // Extract token and file name from the URL
    const filePath = await getFilePathFromStorageToken(token);
    if (!filePath) {
      return next({ message: "File not Found", status: 404 });
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

  const delete_folder_json_post = async (req, res, next) => {
    try {
      const folderPath = path.join(
        uploadsDir,
        req.body.folderPath || "",
        req.body.folderName || ""
      );
      await fs.promises.rmdir(folderPath);
      res.status(200).json({ message: "Folder deleted" });
    } catch (err) {
      next({ message: "Error deleting folder", status: 400 });
    }
  };

  const getDirectoryData = (relativePath) => {
    const currentPath = relativePath ? `/files/${relativePath}` : "/files";
    const { files, folders } = getDirectoryContents_get(
      path.join(uploadsDir, relativePath)
    );
    return { files, folders, currentPath, relativePath };
  };

  /*
    Renders the main file manager display, listing files and folders in 
    current path
  */

  const list_directory_json_get = (req, res, next) => {
    try {
      const data = getDirectoryData(req.params[0] || "");
      res.json({ ...data, user: req.user.username });
    } catch (error) {
      next({ message: "Failed to list directory", status: 500 });
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
  */
  const storeLinkInfo = async (fileName, filePath, link, token) => {
    if (await SharedFile.findOne({ fileName, filePath })) {
      return false; //file already shared
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

  const delete_file_json_post = async (req, res, next) => {
    try {
      const relativeFilePath = req.params[0];
      const filePath = path.join(uploadsDir, relativeFilePath);

      await fs.promises.unlink(filePath);
      await SharedFile.findOneAndDelete({
        filePath,
        fileName: path.basename(filePath),
      });
      res.status(200).json({ message: "File deleted" });
    } catch (err) {
      next({ message: "Error deleting file", status: 400 });
    }
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

  const create_folder_json_post = async (req, res, next) => {
    try {
      const { folderName, currentPath = "" } = req.body;
      const fullPath = path.join(uploadsDir, currentPath, folderName);

      if (fs.existsSync(fullPath)) {
        return next({ message: "Folder already exists", status: 404 });
      }
      fs.promises.mkdir(fullPath);
      res.status(200).json({ message: "Folder created " });
    } catch (err) {
      return next({ message: "Error creating folder", status: 404 });
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
    create_folder_json_post,
    delete_folder_json_post,
    delete_file_json_post,
  };
};
