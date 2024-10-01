
const SftpClient = require('ssh2-sftp-client')
const fs = require('fs')
const path = require('path')
const SftpServer = require('../models/SftpServer')
const mongoose = require('mongoose')
const { PassThrough } = require('stream')
const multer = require('multer')

module.exports = () => {

  const sftp_create_folder_post = async (req, res) => {
    const { currentPath, folderName, serverId } = req.body
    const newPath = path.join(currentPath, folderName)
    const sftp = new SftpClient()

    try {
      const server = await SftpServer.findById(serverId)

      if (!server) {
        return res.status(404).send('server not found')
      }
      const { host, username, password } = server
      await sftp.connect({ host, username, password })
      await sftp.mkdir(newPath)
    } catch (err) {
      console.log(err)
    } finally {
      await sftp.end()
    }
    res.redirect(`/sftp/connect/${serverId}/${currentPath}`)
  }

  const sftp_stream_download_get = async (req, res, next) => {
    const { serverId } = req.params
    const relativePath = req.params[0] || ''
    const remotePath = relativePath ? `/${relativePath}` : '/'
    
    try {
      const server = await SftpServer.findById(serverId)
      if(!server) {
        const err = new Error("Server not found")
        err.status = 404
        return next(err)
      }

      const { host, username, password } = server
      const sftp = new SftpClient()

      await sftp.connect({
        host,
        username,
        password
      })

      res.setHeader('Content-Disposition', `attachment; filename="${remotePath.split('/').pop()}"`)
      res.setHeader('Content-Type', 'application/octet-stream')

      const stream = new PassThrough()

      sftp.get(remotePath, stream)
        .then(() => {
          sftp.end()
        })
        .catch((err) => {
          console.error('Error streaming file:', err)
          sftp.end()
          next(err)
        })
      stream.pipe(res)
    } catch (error) {
      console.log('Error:', error)
      return next(error)
    }
  }

  /*
    downloads a file from sftp server to node server,
    then downloads to client. Better to use stream instead
    so we are not saving anything to node server
  */
  const sftp_download_get = async (req, res) => {
    const { serverId } = req.params
    const relativePath = req.params[0] || ''
    const remotePath = relativePath ? `/${relativePath}` : '/'
    const fileName = remotePath.split('/').filter(Boolean).pop()
    const localFilePath = path.join(path.join(__dirname, 'temp'), fileName)
    const sftp = new SftpClient()
    try {
      const server = await SftpServer.findById(serverId)
      if (!server) {
        return res.status(404).send('server not found')
      }

      const { host, username, password } = server
      await sftp.connect({ host, username, password })
      await sftp.fastGet(remotePath, localFilePath) // Download remote file to local path

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
      await sftp.end()
    } catch (err) {
      console.error(err)
      res.render('sftp', { files: null, message: 'File download failed' })
    }
  }

  const upload = multer()

  /*
    Stream file upload from client to sftp server
  */
  const sftp_stream_upload_post = async(req, res, next) => {
    const { currentDirectory, serverId } = req.body
    try {
      const server = await SftpServer.findById(serverId)

      const { host, username, password } = server
      const sftp = new SftpClient()

      await sftp.connect({
        host,
        username,
        password
      })

      const PassThroughStream = new PassThrough()

      const fileStream = req.files[0].buffer

      PassThroughStream.end(fileStream)

      const remotePath = `${currentDirectory}/${req.files[0].originalname}`

      await sftp.put(PassThroughStream, remotePath)
      res.status(200).send('File uploaded successfully')

    // Close the SFTP connection
    sftp.end()

    } catch (error) {
      console.error('Error uploading file:', error)
      next(error)
    }
  }
  

  // currently the file is being uploaded to this server first, 
  //and then uploaded to the sftp server
  //TODO: stream file from client to sftp server
  const sftp_upload_post = async (req, res) => {
    const { currentDirectory, serverId } = req.body
    const sftp = new SftpClient()
    const file = req.files[0]
    try {
      const server = await SftpServer.findById(serverId)
      if (!server) {
        return res.status(404).send('server not found')
      }

      const { host, username, password } = server
      await sftp.connect({ host, username, password })
      const tempFilePath = file.path // Path to the temporarily uploaded file
      const uploadFileName = file.originalname // Original filename
      const sftpUploadPath = path.join(currentDirectory, uploadFileName)

      await sftp.fastPut(tempFilePath, sftpUploadPath)
      await sftp.end()
      fs.unlinkSync(tempFilePath)
      res.redirect(`/sftp/connect/${serverId}/${currentDirectory}`)

    } catch (err) {
      console.error(err)
      res.redirect('sftp/files')
    }
  }

  const sftp_servers_get = async (req, res, next) => {
    try {
      const servers = await SftpServer.find()
      res.render('sftp-main', { servers })
    } catch (error) {
      return next(error)
    }
  }

  const sftp_save_server_post = async (req, res, next) => {
    const { host, username, password } = req.body
    const newServer = new SftpServer({
      host,
      username,
      password
    })
    try {
      await newServer.save()
      res.redirect('/sftp/')
    } catch (error) {
      console.log(error)
      return next(error)
    }
  }

  const sftp_delete_server_post = async (req, res, next) => {
    const { serverId } = req.body
    try {
      await SftpServer.findByIdAndDelete(serverId)
      res.redirect('/sftp')
    } catch (error) {
      return next(error)
    }
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString() // Format to readable date and time
  }

  const generateBreadcrumb = (relativePath, serverId) => {
    const breadcrumbs = []
    let currentPath = `/sftp/connect/${serverId}/` 
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
  }

  const sftp_id_list_files_get = async (req, res, next) => {
    const { serverId } = req.params
    const currentDirectory = req.params[0] || '/'

    if (!mongoose.Types.ObjectId.isValid(serverId)) {
      const err = new Error("Invalid server ID")
      err.status = 400
      return next(err)
    }
    let sftp
    try {
      const server = await SftpServer.findById(serverId)
      if (!server) {
        const err = new Error("Server not found")
        err.status = 404
        return next(err)
      }

      const { host, username, password } = server

      sftp = new SftpClient()

      await sftp.connect({
        host,
        username,
        password
      })
      const contents = await sftp.list(currentDirectory)

      const { files, folders } = contents.reduce((acc, item) => {
        if (item.type === 'd') {
          acc.folders.push({ name: item.name })
        } else {
          acc.files.push({ 
            name: item.name, 
            size: (item.size / 1024).toFixed(2), 
            date: formatDate(item.modifyTime)
          })
        }
        return acc
      }, { files: [], folders: [] })

      const breadcrumb = generateBreadcrumb(currentDirectory, serverId)
      
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
      return next(error)
    } finally {
      if (sftp) await sftp.end()  // Ensure connection is always closed
    }
  }

  const sftp_delete_file_post = async (req, res, next) => {
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
      return next(error)
    }
  }

  const sftp_delete_folder_post = async (req, res, next) => {
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
      return next(error)
    }
  }

  const ssh_console_get = async (req, res) => {
    const { serverId } = req.params
    const server = await SftpServer.findById(serverId)
    if (!server) {
      res.redirect('/sftp')
    }
    res.render('sshconsole', {
      serverId
    })
  }

  return {
    sftp_upload_post,
    sftp_download_get,
    sftp_create_folder_post,
    sftp_stream_download_get,
    sftp_servers_get,
    sftp_save_server_post,
    sftp_delete_server_post,
    sftp_id_list_files_get,
    sftp_delete_file_post,
    sftp_delete_folder_post,
    ssh_console_get,
    upload,
    sftp_stream_upload_post
  }
}
