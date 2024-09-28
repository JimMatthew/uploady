
const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const sftp = new SftpClient();

module.exports = () => {

  let susername = ''
  let spassword = ''
  let shost = ''
  const sftp_get = (req, res) => {
    res.render('sftp', { files: null, message: null });
  }

  const sft_connect_post = async (req, res) => {
      const { host, username, password, directory } = req.body;
      susername = username
      spassword = password
      shost = host
      const currentDirectory = directory || '/'; // Default to root if not provided
    
      

      try {
        await sftp.connect({ host, username, password });
        //const fileList = await sftp.list(currentDirectory);
        const contents = await sftp.list(currentDirectory);
        const files = [];
        const folders = [];
        const breadcrumb = generateBreadcrumbs(currentDirectory)
        contents.forEach(item => {
          if (item.type === 'd') {
            folders.push({ name: item.name });
          } else {
            files.push({ name: item.name, size: (item.size / 1024).toFixed(2), date: item.modifyTime });
          }
        });
        res.render('sftplist', { 
          files: files, 
          folders: folders,
          message: `Connected to SFTP server at ${currentDirectory}`, 
          currentDirectory: currentDirectory, 
          currentPath: currentDirectory,
          host, 
          username, 
          password,
          breadcrumb
        });
        await sftp.end();
      } catch (err) {
        console.error(err);
        res.render('sftplist', { 
          files: null, 
          message: 'Failed to connect or access the directory', 
          currentDirectory, 
          host, 
          username, 
          password 
        });
      }
  }

  const generateBreadcrumbs = (relativePath) => {
    const breadcrumbs = []
    let currentPath = '/sftp/files' // Start from the root (/files)
    const pathParts = relativePath.split('/').filter(Boolean)

    pathParts.forEach((part, index) => {
      currentPath += `/${part}`
      breadcrumbs.push({
        name: part,
        path: currentPath,
      })
    })
    breadcrumbs.unshift({ name: 'Home', path: '/sftp/files/' })

    return breadcrumbs
  };

  const sft_list_directory_get = async (req, res) => {
    ensureSftpConnection(req,res)
    const directory = req.body.directory
    const currentDirectory = directory || '/'; // Default to root if not provided
    const fileList = await req.session.sftp.list(currentDirectory);
    res.render('sftplist', { 
      files: fileList, 
      message: `Connected to SFTP server at ${currentDirectory}`, 
      currentDirectory, 
    });
  }

  const list_directory_get = async (req, res) => {
    const relativePath = req.params[0] || ''
    const remotePath = relativePath ? `/${relativePath}` : '/';
    const breadcrumb = generateBreadcrumbs(remotePath)
    console.log('rp: '+ remotePath)
    try {
      const { folders, files } = await getSFTPFolderContents(remotePath);
      res.render('sftplist', { 
        folders,
        files,
        currentDirectory: remotePath,
        username: susername,
        password: spassword,
        host: shost, 
        breadcrumb
      });
    } catch (err) {
      res.status(500).send('Error fetching SFTP contents');
    }
  }

  const getSFTPFolderContents = async (remotePath) => {
    //const { host, username, password, directory } = req.body;
    console.log("sh: "+shost)
    try {
      await sftp.connect({
        host: shost,
        username: susername,
        password: spassword
      });
      const contents = await sftp.list(remotePath);
      const files = [];
      const folders = [];
      
      contents.forEach(item => {
        if (item.type === 'd') {
          folders.push({ name: item.name });
        } else {
          files.push({ name: item.name, size: (item.size / 1024).toFixed(2), date: item.modifyTime });
        }
      });

      return { folders, files };
    } catch (err) {
      console.error(err);
    } finally {
      await sftp.end();
    }
  };

  const sftp_create_folder_post = async (req, res) => {
    const { currentPath, folderName } = req.body;
    const newPath = path.join(currentPath, folderName)
    const sftp = new SftpClient();
    console.log('np: '+newPath)
    try{
      await sftp.connect({ host: shost,username: susername, password: spassword });
    await sftp.mkdir(newPath)
    
    } catch (err) {
      console.log(err)
    } finally {
      await sftp.end();
    }
    res.redirect(`/sftp/files/${currentPath}`)
    
  }

  /*
  Download a file from sftp server. 
  We transfer the file from SFTP server to a temp file on this server, 
  and then download to client. We then remove the temp file
  */
  const sftp_download_post = async (req, res) => {
      const { host, username, password, remoteFilePath, remoteFileName } = req.body;
      const sftp = new SftpClient();
      const remoteFile = path.join(remoteFilePath, remoteFileName)
      const localFilePath = path.join(path.join(__dirname, 'temp'), remoteFileName)
      try {
        await sftp.connect({ host, username, password });
        await sftp.fastGet(remoteFile, localFilePath); // Download remote file to local path
        
        res.download(localFilePath, (err) => {
        if (err) {
          return res.status(500).send('File not found')
        }
        fs.unlink(localFilePath, (err) => {
          if (err) {
            return res.status(500).send('unable to delete file')
          }
        })
      })
        await sftp.end();
      } catch (err) {
        console.error(err);
        res.render('sftp', { files: null, message: 'File download failed' });
      }
  }

  const sftp_stream_download_get = async (req, res) => {
    const relativePath = req.params[0] || ''
    const remotePath = relativePath ? `/${relativePath}` : '/';
    const fileName =remotePath.split('/').filter(Boolean).pop()
    const localFilePath = path.join(path.join(__dirname, 'temp'), fileName)
    console.log('rp: '+remotePath)
    const sftp = new SftpClient();
    try {
      await sftp.connect({ host:shost, username:susername, password: spassword });
      //await sftp.fastGet(remotePath, localFilePath); // Download remote file to local path
      
     
      //const stream = await sftp.get(remotePath);
      
      // Set appropriate headers
      sftp.stat(remotePath, (err, stats) => {
        if (err) {
            res.status(404).send("The file does not exist");
            return;
        }
        console.log('stat: '+stats.size)
        res.header("Content-Disposition", `attachment; filename="${fileName}"`);
        res.header("Content-Length", stats.size);

        const readStream = sftp.createReadStream(remotePath);
        readStream.pipe(res);
    });
  
    } catch (err) {
      console.error('Error:', err);
      res.status(500).send('Error downloading file from SFTP');
    } finally {
      await sftp.end(); // Close the SFTP connection
    }
    
  }

  const sftp_download_get = async (req, res) => {
    const relativePath = req.params[0] || ''
    const remotePath = relativePath ? `/${relativePath}` : '/';
    const fileName =remotePath.split('/').filter(Boolean).pop()
    const localFilePath = path.join(path.join(__dirname, 'temp'), fileName)
    console.log('rp: '+remotePath)
    console.log('lp: '+ localFilePath)

    const sftp = new SftpClient();

    try {
      await sftp.connect({ host:shost, username:susername, password: spassword });
      await sftp.fastGet(remotePath, localFilePath); // Download remote file to local path
      
      res.download(localFilePath, (err) => {
      if (err) {
        return res.status(500).send('File not found')
      }
      fs.unlink(localFilePath, (err) => {
        if (err) {
          return res.status(500).send('unable to delete file')
        }
      })
    })
      await sftp.end();
    } catch (err) {
      console.error(err);
      res.render('sftp', { files: null, message: 'File download failed' });
    }
  }
  const tempdir = path.join(__dirname, '../temp')

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(tempdir))  // Use the provided uploads directory
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)  // Preserve the original file name
    }
  })

  const upload = multer({ storage: storage })
  

  const sftp_upload_post = async (req, res) => {
      const { currentDirectory } = req.body;
      const sftp = new SftpClient();
      const file = req.files[0]
      try {
        await sftp.connect({ host: shost, username: susername, password: spassword });
        const tempFilePath = file.path // Path to the temporarily uploaded file
          const uploadFileName = file.originalname // Original filename
          console.log('fp: ' +tempFilePath)
          console.log('ufl: '+ uploadFileName)
          const sftpUploadPath = path.join(currentDirectory, uploadFileName)
          console.log('sup: '+sftpUploadPath)
    
          await sftp.fastPut(tempFilePath, sftpUploadPath); 
        
        await sftp.end();
        fs.unlinkSync(tempFilePath)
        res.redirect(`/sftp/files/${currentDirectory}`);
        
      } catch (err) {
        console.error(err);
        res.redirect('sftp/files');
      }
  }

  return {
    sftp_get,
    sft_list_directory_get,
    sft_connect_post,
    getSFTPFolderContents,
    sftp_download_post,
    sftp_upload_post,
    list_directory_get,
    sftp_download_get,
    sftp_create_folder_post,
    upload,
    sftp_stream_download_get
  }
}
