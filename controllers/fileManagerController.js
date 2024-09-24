const fs = require('fs');
const fsp = require('fs').promises
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const SharedFile = require('../models/SharedFile')
const StoreType = require('../ConfigStorageType');
const ConfigStoreType = require('../ConfigStorageType');


module.exports = (configStoreType) => {

  const sharedLinks = new Map()
  const uploadsDir = path.join(__dirname, '../uploads')

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      //const p = req.params.relativePath || ''
      cb(null, path.join(uploadsDir))  // Use the provided uploads directory
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)  // Preserve the original file name
    }
  })

  const upload = multer({ storage: storage })

  const uploadMiddleware = upload.array('files', 10)

  const upload_file_post = (req, res) => {
    if (!req.files) {
      return res.status(400).send('No file uploaded')
    }
    res.redirect('/')
  }

  const upload_files_post = (req, res) => {
    const folderPath = req.body.folderPath || '' // Default to root if no folder is provided
    const targetFolder = path.join(uploadsDir, folderPath)
    console.log('fpaf: '+targetFolder)
    if (!fs.existsSync(targetFolder)) {
      return res.status(400).send('Folder does not exist')
    }

    const files = req.files
    if (!files) {
      return res.status(400).send('No file uploaded')
    }

    files.forEach(file => {
      const targetPath = path.join(targetFolder, file.originalname)
      const currPath = path.join(uploadsDir, file.originalname)
      console.log('tp: '+targetPath)
      console.log('cp: '+currPath)
      fs.rename(currPath, targetPath ,(err) =>{
        if (err) {
          throw err
        }
      })
    })
    
    // Move the file to the correct folder
    res.redirect(`/files`) 
  }

  const generateShareLink = (req, res) => {
    const relativeFilePath = req.body.filePath || ''// Pass full relative path from client
    const fileName = req.body.fileName
    const absoluteFilePath = path.join(uploadsDir, relativeFilePath, fileName)
    console.log('re '+relativeFilePath)
    console.log('relf: '+absoluteFilePath)
    if (!fs.existsSync(absoluteFilePath)) {
      return res.status(404).send('File not found')
    }
    
    console.log('name: '+fileName)
  
    const token = crypto.randomBytes(5).toString('hex') // Generate random token
    const shareLink = `${req.protocol}://${req.get('host')}/share/${token}/${fileName}`
    //sharedFiles.set(token, absoluteFilePath) // Map token to full file path
    storeLinkInfo(fileName, absoluteFilePath, shareLink, token)
    // Generate the public URL to share
    
  
    res.render('linkgen', {
      link: shareLink,
      fileName: fileName
    })
  }

  const serveSharedFile = async (req, res) => {
    const { token, filename } = req.params // Extract token and file name from the URL
    console.log('ss: '+token)
    console.log('ssfn: '+filename)
    const filePath = await getFilePathFromStorageToken(token)
    //const filePath = sharedFiles.get(token) // Retrieve the file path using the token
  
    if (!filePath) {
      return res.status(404).send('Shared link not found')
    }
  
    const absoluteFilePath = path.join(path.dirname(filePath), filename) // Rebuild the full file path
  
    // Check if the file exists
    if (!fs.existsSync(absoluteFilePath)) {
      return res.status(404).send('File not found')
    }
  
    // Serve the file for download
    res.download(absoluteFilePath, filename, (err) => {
      if (err) {
        return res.status(500).send('Error downloading file')
      }
    })
  }

  const getFilePathFromStorageToken = async (token) => {
    switch (configStoreType) {
      case ConfigStoreType.DATABASE:
        const sharedFile = await SharedFile.findOne({ token });
        return sharedFile ? sharedFile.filePath : null
  
      case ConfigStoreType.LOCAL:
        return sharedLinks.get(token)
  
      default:
        throw new Error('Invalid storage type')
    }
  }

  const deleteFolder = (req, res) => {
    const relativePath = req.body.folderPath ||'' // Path relative to the uploads directory
    const folderName = req.body.folderName || ''
    const folderPath = path.join(uploadsDir, relativePath, folderName)
    console.log('del fo: '+folderPath)
    
    fs.rmdir(folderPath, (err) =>{
      if(err){
        console.log(err)
      }
    })
    res.redirect(`/files/${relativePath}`)
  }

  const generateBreadcrumbs = (relativePath) => {
    const breadcrumbs = []
    let currentPath = '' // Start from the root (/files)
  
    // Split the path by / and generate breadcrumbs
    const pathParts = relativePath.split('/').filter(Boolean) // filter(Boolean) removes empty parts
  
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`
      breadcrumbs.push({
        name: part,
        path: currentPath,
      })
    })
  
    // Add root breadcrumb
    breadcrumbs.unshift({ name: 'Home', path: '/files' })
  
    return breadcrumbs
  };

  const list_directory_get = (req, res) => {
    const relativePath = req.params[0] || ''
    let npath = path.join(uploadsDir, relativePath);
    const currentPath = relativePath ? `/files/${relativePath}` : '/files';
    const { files, folders } = getDirectoryContents_get(npath)
    //const { files, folders } = getFolderContents(npath)
    //const { files, folders } = directoryContents_get(npath)
    console.log(currentPath)
    const breadcrumb = generateBreadcrumbs(currentPath)
    res.render('files', { 
      files: files, 
      folders: folders, 
      breadcrumb: breadcrumb, 
      currentPath: currentPath,
      relativePath: relativePath,
      user: req.user 
    })
  }

  const listFiles = (req, res) => {
    fs.readdir(uploadsDir, (err, files) => {
      if (err) {
        return res.status(500).send('Unable to scan directory')
      }
      const fileList = files.map(file => {
        const stats = fs.statSync(path.join(uploadsDir, file))
        return {
          name: file,
          size: stats.size,
          date: stats.mtime.toLocaleDateString(),
        }
      })
      res.render('index', { files: fileList , user: req.user })
    })
  }

  const getFolderContents = async (relativePath) => {
    const folderPath = relativePath
    console.log('Folder path: ' + folderPath);
  
    try {
      // Read the directory and get Dirent objects
      const files = await fsp.readdir(folderPath, { withFileTypes: true });
  
      // Filter for directories
      const folderList = files
        .filter(file => file.isDirectory())
        .map(folder => ({
          name: folder.name,
          path: path.join(relativePath, folder.name)
        }));
  
      // Filter for files and retrieve their stats asynchronously
      const fileList = await Promise.all(
        files.filter(file => file.isFile()).map(async (file) => {
          const filePath = path.join(folderPath, file.name);
          const stats = await fsp.stat(filePath);
          return {
            name: file.name,
            size: (stats.size / 1024).toFixed(2), // size in KB
            date: stats.mtime.toLocaleDateString(),
            path: path.join(relativePath, file.name)
          };
        })
      );
  
      return { folders: folderList, files: fileList };
    } catch (err) {
      console.error('Error reading folder contents: ', err);
      throw err;
    }
  };

  const getDirectoryContents_get = (dirPath) => {
    const contents = fs.readdirSync(dirPath)
    const files = []
    const folders = []
  
    contents.forEach((item) => {
      const itemPath = path.join(dirPath, item)
      const stats = fs.lstatSync(itemPath)
  
      if (stats.isDirectory()) {
        folders.push({ name: item }) // Only push the name for folders
      } else if (stats.isFile()) {
        files.push({
          name: item,                               // File name
          size: (stats.size / 1024).toFixed(2),     // Size in KB
          date: stats.mtime.toLocaleDateString()    // Last modified date
        })
      }
    })
  
    return { files, folders }
  }

  const getDirectoryContents = (dirPath) => {
    const contents = fs.readdirSync(dirPath);
    const files = [];
    const folders = [];
  
    contents.forEach((item) => {
      const itemPath = path.join(dirPath, item);
      if (fs.lstatSync(itemPath).isDirectory()) {
        folders.push(item);
      } else {
        files.push(item);
      }
    });
    
  
    return { files, folders };
  };
  
  
  const directory_list_get =  (req, res) => {
    const relativePath = req.params.subdir || ''; // Capture the subdir or default to root
    console.log("Relative path: " + relativePath);
  
    try {
      const { folders, files } =  getFolderContents(relativePath);
      console.log(folders)
      const currentPath = relativePath ? `/files/${relativePath}` : '/files';
      
      res.render('dirlist', { folders: folders, files: files, currentPath: currentPath });
    } catch (err) {
      res.status(404).send(err);
    }
  };

  const getLinksFromLocal = (req) => {
    return Array.from(sharedLinks.entries()).map(([token, data]) => ({
      link: `${req.protocol}://${req.get('host')}/share/${token}`,
      fileName: token,
    }))
  }

  const file_links_get = async (req, res) => {
    let links = []

      switch (configStoreType) {
        case ConfigStoreType.LOCAL:
          links = getLinksFromLocal(req)
          break
        case ConfigStoreType.DATABASE:
          links = await SharedFile.find()
          break
        default:
          return res.status(500).send('invalid storage type')  
      }
      res.render('public-links', { links })
  }

  const share_file_post = async (req, res) => {
    const fileName = req.body.fileName
    const filePath = path.join(uploadsDir, fileName)
    const link = `${req.protocol}://${req.get('host')}/share/${fileName}`
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found')
    }
    storeLinkInfo(fileName, filePath, link)
    res.render('linkgen', {
      link: link,
      fileName: fileName
    })
  }

  const storeLinkInfo = async (fileName, filePath, link, token) => {
    switch (configStoreType) {
      case StoreType.DATABASE:
        const f = await SharedFile.findOne({ fileName })
        if (f) {  //don't add link again if already present
          return
        }
        const sharedFile = new SharedFile({
          fileName,
          filePath,
          link,
          token,
        })
        await sharedFile.save();
        break;
      case StoreType.LOCAL:
        sharedLinks.set(fileName, filePath)
        break;
    }
  } 

  const stop_sharing_post = async (req, res) => {
    const fileName = req.body.fileName
    switch (configStoreType) {
      case ConfigStoreType.DATABASE:
        await SharedFile.deleteOne({ fileName })
        break
      case ConfigStoreType.LOCAL:
        if (sharedLinks.has(fileName)) {
          sharedLinks.delete(fileName)
        }
    }
    res.redirect('/links')
  }

  const getFilePathFromStorage = async (fileName) => {
    switch (configStoreType) {
      case ConfigStoreType.DATABASE:
        const sharedFile = await SharedFile.findOne({ fileName });
        return sharedFile ? sharedFile.filePath : null
  
      case ConfigStoreType.LOCAL:
        return sharedLinks.get(fileName)
  
      default:
        throw new Error('Invalid storage type')
    }
  }

  const checkFileExists = (filePath) => {
    return filePath && fs.existsSync(filePath)
  }

  const download_shared_file_get = async (req, res) => {
    try {
      const fileName = req.params.token
      const filePath = await getFilePathFromStorage(fileName)

      if (!checkFileExists(filePath)) {
        return res.status(404).send('Error downloading file')
      }

      res.download(filePath, (err) => {
        if (err) {
          return res.status(500).send('Error downloading file')
        }
      })
    }catch (error) {
      console.error(error);
      res.status(500).send('Server error');
    }
  }

  const delete_file_post = async (req, res) => {
    const relativeFilePath = req.params[0] 
    const filePath = path.join(uploadsDir, relativeFilePath)
    const fileName = path.basename(filePath)
    fs.unlink(filePath, (err) => {
      if (err) {
        return res.status(500).send('unable to delete file')
      }
    })
    switch (configStoreType) {
      case ConfigStoreType.LOCAL:
        if (sharedLinks.has(fileName)) {
          sharedLinks.delete(fileName)
        }
        break

      case ConfigStoreType.DATABASE:
        await SharedFile.findOneAndDelete({ fileName }) 
    }
    res.redirect('/')
  }

  const download_file_get = (req, res) => {
    
    const relativeFilePath = req.params[0] // This captures everything after /download/
    const filePath = path.join(uploadsDir, relativeFilePath)

    console.log('dfp: '+filePath)
    res.download(filePath, (err) => {
      if (err) {
        return res.status(500).send('File not found')
      }
    })
  }

 
  
  // Helper function to create a new folder
  const createFolder = (dirPath, folderName) => {
    console.log('fopa: '+dirPath)
    const newFolderPath = path.join(dirPath, folderName);
    if (!fs.existsSync(newFolderPath)) {
      fs.mkdirSync(newFolderPath);
    } else {
      //throw new Error('Folder already exists');
    }
  };

  const create_folder_post = (req, res) => {
    const { folderName, currentPath } = req.body;

    try {
      const fullPath = path.join(uploadsDir, currentPath || '');
      console.log(fullPath)
      createFolder(fullPath, folderName);
      res.redirect(`/files`);  // Redirect to the current directory
    } catch (err) {
      res.status(400).send('Error creating folder');
    }
  }

  return {
    uploadMiddleware, 
    upload_file_post,
    listFiles,
    file_links_get,
    share_file_post,
    stop_sharing_post,
    download_shared_file_get,
    delete_file_post,
    download_file_get,
    create_folder_post,
    list_directory_get,
    directory_list_get,
    upload_files_post,
    generateShareLink,
    serveSharedFile,
    deleteFolder,
  }
}
  

