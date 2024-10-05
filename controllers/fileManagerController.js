const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const SharedFile = require("../models/SharedFile");
const StoreType = require("../ConfigStorageType");
const ConfigStoreType = require("../ConfigStorageType");

module.exports = (configStoreType) => {
  const sharedLinks = new Map();
  const uploadsDir = path.join(__dirname, "../uploads");
  const tempdir = path.join(__dirname, "../temp");
  const domain = "uploady.lan"

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
    This is mostly done to allow duplicate filenames to be shared without
    exposing the users directory structure
  */
  const generateShareLink = async (req, res, next) => {
    const relativeFilePath = req.body.filePath || ""; // Pass full relative path from client
    const fileName = req.body.fileName;
    const absoluteFilePath = path.join(uploadsDir, relativeFilePath, fileName);
    console.log(relativeFilePath)
    if (!fs.existsSync(absoluteFilePath)) {
      const err = new Error("File not found");
      err.status = 404;
      return next(err);
    }
    const relPathName = path.join(relativeFilePath, fileName);
    const token = crypto.randomBytes(5).toString("hex"); // Generate random token
    const shareLink = `${req.protocol}://${domain}/share/${token}/${fileName}`;

    if (!(await storeLinkInfo(fileName, relPathName, shareLink, token))) {
      const err = new Error("This File is already shared");
      err.status = 404;
      return next(err);
    }
    res.render("linkgen", {
      link: shareLink,
      fileName: fileName,
    });
  };

  const generateShareLinkJsonPost = async (req, res, next) => {
    const relativeFilePath = req.body.filePath || ""; // Pass full relative path from client
    const fileName = req.body.fileName;
    const absoluteFilePath = path.join(uploadsDir, relativeFilePath, fileName);

    if (!fs.existsSync(absoluteFilePath)) {
      return res.status(400).json({
        error: 'File not found',
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

  /*
    Return the path of a shared file by looking up the token
    using the configured storage type
  */
  const getFilePathFromStorageToken = async (token) => {
    switch (configStoreType) {
      case ConfigStoreType.DATABASE:
        const sharedFile = await SharedFile.findOne({ token });
        return sharedFile ? path.join(uploadsDir, sharedFile.filePath) : null;

      case ConfigStoreType.LOCAL:
        return sharedLinks.get(token);

      default:
        throw new Error("Invalid storage type");
    }
  };

  /*
    delete folder from specified location
  */
  const deleteFolder = (req, res, next) => {
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
    res.redirect(`/files/${relativePath}`);
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
    
    const list_directory_view_get = (req, res) => {
      const relativePath = req.params[0] || "";
      try {
        const data = getDirectoryData(relativePath);
        res.render("files", { ...data, user: req.user });
      } catch (error) {
        res.status(500).render("error", {
          message: "Failed to list directory contents",
          error: error.message,
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

  const getLinksFromLocal = (req) => {
    return Array.from(sharedLinks.entries()).map(([token, data]) => ({
      link: `${req.protocol}://${req.get("host")}/share/${token}`,
      fileName: token,
    }));
  };

  /*
    Renders display of all links shared by user
  */
  const file_links_get = async (req, res) => {
    let links = [];

    switch (configStoreType) {
      case ConfigStoreType.LOCAL:
        links = getLinksFromLocal(req);
        break;
      case ConfigStoreType.DATABASE:
        links = await SharedFile.find();
        break;
      default:
        return res.status(500).send("invalid storage type");
    }
    res.render("public-links", { links });
  };

  const file_links_json_get = async (req, res) => {
    const links = await SharedFile.find();

    res.json({ links })
  }

  /*
    Store file info for shared file
    Save to configured storage 
  */
  const storeLinkInfo = async (fileName, filePath, link, token) => {
    switch (configStoreType) {
      case StoreType.DATABASE:
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
        break;
      case StoreType.LOCAL:
        sharedLinks.set(fileName, filePath);
        break;
    }
    return true;
  };

  const stop_sharing_post = async (req, res) => {
    const fileName = req.body.fileName;
    switch (configStoreType) {
      case ConfigStoreType.DATABASE:
        await SharedFile.deleteOne({ fileName });
        break;
      case ConfigStoreType.LOCAL:
        if (sharedLinks.has(fileName)) {
          sharedLinks.delete(fileName);
        }
    }
    res.redirect("/links");
    await SharedFile.deleteOne({ fileName });
  };

  const stop_sharing_json_post = async (req, res) => {
    const token = req.body.token
    console.log('deltoken: '+token)
    await SharedFile.deleteOne({ token });
    res.status(200).json({
      message: "link deleted",
    });
  }

  const delete_file_post = async (req, res, next) => {
    const relativeFilePath = req.params[0];
    const filePath = path.join(uploadsDir, relativeFilePath);
    const fileName = path.basename(filePath);
    console.log('rp: '+relativeFilePath)
    console.log('fp: '+filePath)
    fs.unlink(filePath, (err) => {
      if (err) {
        const err = new Error("Unable to delete file");
        err.status = 404;
        return next(err);
      }
    });
    switch (configStoreType) {
      case ConfigStoreType.LOCAL:
        if (sharedLinks.has(fileName)) {
          sharedLinks.delete(fileName);
        }
        break;

      case ConfigStoreType.DATABASE:
        const fullPath = path.join(filePath, fileName);
        await SharedFile.findOneAndDelete({ filePath, fileName });
        
        res.redirect("/files");
    }
    
    
  };

  const delete_file_jspn_post = async (req, res, next) => {
    const relativeFilePath = '/'+req.params[0];
    const filePath = path.join(uploadsDir, relativeFilePath);
    const fileName = path.basename(filePath);
    console.log('rp: '+relativeFilePath)
    console.log('fp: '+filePath)
    fs.unlink(filePath, (err) => {
      if (err) {
        throw err
      }
    });
    switch (configStoreType) {
      case ConfigStoreType.LOCAL:
        if (sharedLinks.has(fileName)) {
          sharedLinks.delete(fileName);
        }
        break;

      case ConfigStoreType.DATABASE:
        const fullPath = path.join(filePath, fileName);
        await SharedFile.findOneAndDelete({ filePath, fileName });
        res.status(200).json({
          message: "file deleted",
        });

    }
    
    
  };

  const download_file_get = (req, res, next) => {
    const relativeFilePath = req.params[0]; // This captures everything after /download/
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

  const create_folder_post = (req, res, next) => {
    const { folderName, currentPath } = req.body;
    try {
      const fullPath = path.join(uploadsDir, currentPath || "");
      createFolder(fullPath, folderName);
      res.redirect(`/files/${currentPath}`); // Redirect to the current directory
    } catch (err) {
      return next(err);
    }
  };

  const create_folder_json_post = (req, res, next) => {
    const { folderName, currentPath } = req.body;
    try {
      const fullPath = path.join(uploadsDir, currentPath || "");
      createFolder(fullPath, folderName);
      res.status(200).json({
        message: "file created",
      }); 
    } catch (err) {
      return next(err);
    }
  };

  return {
    file_links_get,
    stop_sharing_post,
    delete_file_post,
    download_file_get,
    create_folder_post,
    upload_files_post,
    generateShareLink,
    serveSharedFile,
    deleteFolder,
    list_directory_json_get,
    list_directory_view_get,
    file_links_json_get,
    generateShareLinkJsonPost,
    stop_sharing_json_post,
    delete_file_jspn_post,
    create_folder_json_post,
    delete_folder_json_post
  };
};
