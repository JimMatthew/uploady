
const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const sftp = new SftpClient();
const SftpServer = require('../models/SftpServer')
module.exports = () => {

  const sftp_get = (req, res) => {
    res.render('sftp', { files: null, message: null });
  }

  const sftp_home_get = (req, res) => {
    res.render('sftp-main');
  }

  const generateBreadcrumb = (relativePath, serverId) => {
    const breadcrumbs = []
    let currentPath = `/sftp/connect/${serverId}/` // Start from the root (/files)
    const pathParts = relativePath.split('/').filter(Boolean)

    pathParts.forEach((part, index) => {
      currentPath += `/${part}`
      breadcrumbs.push({
        name: part,
        path: currentPath,
      })
    })
    breadcrumbs.unshift({ name: 'Home', path: `/sftp/connect/${serverId}/` })

    return breadcrumbs
  };

  const sftp_create_folder_post = async (req, res) => {
    const { currentPath, folderName, serverId } = req.body;
    const newPath = path.join(currentPath, folderName)
    const sftp = new SftpClient();
    try{
      const server = await SftpServer.findById(serverId)
      if (!server) {
        return res.status(404).send('server not found')
      }
      const { host, username, password } = server
      await sftp.connect({ host ,username, password });
      await sftp.mkdir(newPath)
    
    } catch (err) {
      console.log(err)
    } finally {
      await sftp.end();
    }
    res.redirect(`/sftp/connect/${serverId}/${currentPath}`)
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
      
      res.header("Content-Disposition", `attachment; filename="${fileName}"`);
      res.header("Content-Length", stats.size);

      const readStream = sftp.createReadStream(remotePath);
      readStream.pipe(res);
  
    } catch (err) {
      console.error('Error:', err);
      res.status(500).send('Error downloading file from SFTP');
    } finally {
      await sftp.end(); 
    }
  }

  const sftp_download_get = async (req, res) => {
    const relativePath = req.params[0] || ''
    const remotePath = relativePath ? `/${relativePath}` : '/';
    const fileName =remotePath.split('/').filter(Boolean).pop()
    const localFilePath = path.join(path.join(__dirname, 'temp'), fileName)
    console.log('rp: '+remotePath)
    console.log('lp: '+ localFilePath)
    const { serverId } = req.params
    const sftp = new SftpClient();

    try {
      const server = await SftpServer.findById(serverId)
      if (!server) {
        return res.status(404).send('server not found')
      }

      const { host, username, password } = server
      await sftp.connect({ host, username, password });
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
      const { currentDirectory, serverId } = req.body;
      const sftp = new SftpClient();
      const file = req.files[0]
      try {
        const server = await SftpServer.findById(serverId)
        if (!server) {
          return res.status(404).send('server not found')
        }

        const { host, username, password } = server
        await sftp.connect({ host, username, password });
        const tempFilePath = file.path // Path to the temporarily uploaded file
        const uploadFileName = file.originalname // Original filename
        console.log('fp: ' +tempFilePath)
        console.log('ufl: '+ uploadFileName)
        const sftpUploadPath = path.join(currentDirectory, uploadFileName)
        console.log('sup: '+sftpUploadPath)
    
        await sftp.fastPut(tempFilePath, sftpUploadPath); 
        
        await sftp.end();
        fs.unlinkSync(tempFilePath)
        res.redirect(`/sftp/connect/${serverId}/${currentDirectory}`);
        
      } catch (err) {
        console.error(err);
        res.redirect('sftp/files');
      }
  }

  const sftp_servers_get = async (req, res) => {
    try {
      const servers = await SftpServer.find()
      res.render('sftp-main', { servers })
    } catch (error) {
      res.status(500).send('error loading servers')
    }
  }

  const sftp_save_server_post = async (req, res) => {
    const { host, username, password } = req.body
    console.log('host: '+host)
    const newServer = new SftpServer({
      host,
      username,
      password
    })

    try {
      await newServer.save()
      res.redirect('/sftps/')
    } catch (error) {
      console.log(error)
      res.status(500).send('error saving server')
    }
  }

  const sftp_id_list_files_get = async (req, res) => {
    console.log('entered')
    const { serverId } = req.params
    const currentDirectory = req.params[0] || '/'
    console.log('si: '+serverId)
    console.log('cd: '+currentDirectory)
    try{
      const server = await SftpServer.findById(serverId)
      if (!server) {
        return res.status(404).send('server not found')
      }

      const { host, username, password } = server

      const sftp = new SftpClient()

      await sftp.connect({
        host,
        username,
        password
      })

      const contents = await sftp.list(currentDirectory);
      const files = [];
      const folders = [];
      
      contents.forEach(item => {
        if (item.type === 'd') {
          folders.push({ name: item.name })
        } else {
          files.push({ name: item.name, size: (item.size / 1024).toFixed(2), date: item.modifyTime })
        }
      })
      const breadcrumb = generateBreadcrumb(currentDirectory, serverId)
      await sftp.end()

      res.render('sftplist', {
        files,
        folders,
        currentDirectory,
        breadcrumb,
        serverId,
        host
      })

    } catch (error) {
      console.log(error)
      res.status(500).send('error connecting to sftp server')
    }
  }

  const sftp_delete_file_post = async (req, res) => {
    const { serverId, currentDirectory, fileName } = req.body
    const fullPath = path.join(currentDirectory, fileName)
    const server = await SftpServer.findById(serverId)
      if (!server) {
        return res.status(404).send('server not found')
      }

      const { host, username, password } = server

      const sftp = new SftpClient()
      try {
        await sftp.connect({
          host,
          username,
          password
        })
  
        await sftp.delete(fullPath)
        res.redirect(`/sftp/connect/${serverId}/${currentDirectory}/`)
      } catch (error) {
        res.status(500).send('error deleting file')
      }
  }

  const sftp_delete_folder_post = async (req, res) => {
    const { serverId, currentDirectory, deleteDir } = req.body
    const fullPath = path.join(currentDirectory, deleteDir)
    const server = await SftpServer.findById(serverId)
      if (!server) {
        return res.status(404).send('server not found')
      }

      const { host, username, password } = server

      const sftp = new SftpClient()
      try {
        await sftp.connect({
          host,
          username,
          password
        })
  
        await sftp.rmdir(fullPath)
        res.redirect(`/sftp/connect/${serverId}/${currentDirectory}/`)
      } catch (error) {
        res.status(500).send('error deleting file')
      }
  }

  return {
    sftp_get,
    sftp_upload_post,
    sftp_download_get,
    sftp_create_folder_post,
    upload,
    sftp_stream_download_get,
    sftp_home_get,
    sftp_servers_get,
    sftp_save_server_post,
    sftp_id_list_files_get,
    sftp_delete_file_post,
    sftp_delete_folder_post
  }
}
