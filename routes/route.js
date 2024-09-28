const express = require('express');
const sftpController = require('../controllers/sftpController')()
const storageController = require('../controllers/storageController')

module.exports = function (uploadsDir, isAuthenticated, configStoreType) {

  const filemanagerController = require('../controllers/fileManagerController')(configStoreType)

  const router = express.Router()

  //list all files in the managed directory
  router.get('/files', isAuthenticated, filemanagerController.list_directory_get); 

  //list all files in path
  router.get('/files/*', isAuthenticated, filemanagerController.list_directory_get)

  //download file from public link - not authenticated
  router.get('/share/:token/:filename', filemanagerController.serveSharedFile)

  //display list of all shared links
  router.get('/links', isAuthenticated, filemanagerController.file_links_get)

  //create a public link for a file
  router.post('/share', isAuthenticated, filemanagerController.generateShareLink)

  //stop sharing a public file
  router.post('/stop-sharing', isAuthenticated, filemanagerController.stop_sharing_post)

  //delete file from managed directory
  router.post('/delete/*', isAuthenticated, filemanagerController.delete_file_post)

  //download file from managed directory - is authenticated
  router.get('/download/*', isAuthenticated, filemanagerController.download_file_get)
  
  //upload file/s to managed directory
  router.post('/upload', isAuthenticated, storageController.uploadMiddleware, 
    filemanagerController.upload_files_post)

  router.post('/create-folder', isAuthenticated, filemanagerController.create_folder_post)
  
  router.post('/delete-folder', isAuthenticated, filemanagerController.deleteFolder)

  //Routes for the SFTP controller 
  router.get('/sftp', sftpController.sftp_servers_get)
  router.get('/sftp/connect/:serverId/*?', sftpController.sftp_id_list_files_get)
  router.post('/sftp/upload',  storageController.uploadMiddleware, sftpController.sftp_upload_post)
  router.get('/sftp/download/:serverId/*', sftpController.sftp_download_get)
  router.post('/sftp/create-folder', sftpController.sftp_create_folder_post)
  router.post('/sftp/save-server', sftpController.sftp_save_server_post)
  router.post('/sftp/delete-file', sftpController.sftp_delete_file_post)
  router.post('/sftp/delete-folder', sftpController.sftp_delete_folder_post)
  return router
}