const express = require('express');
const sftpController = require('../controllers/sftpController')
const StoreType = require('../ConfigStorageType')

module.exports = function (uploadsDir, isAuthenticated, configStoreType) {

  const filemanagerController = require('../controllers/fileManagerController')(configStoreType)

  const router = express.Router()
  //list all files in the managed directory
  router.get('/', isAuthenticated, filemanagerController.listFiles)

  //router.get('/files', isAuthenticated, filemanagerController.list_directory_get)
  router.get('/files', isAuthenticated, filemanagerController.list_directory_get);  
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
  router.post('/upload', isAuthenticated, filemanagerController.uploadMiddleware, 
    filemanagerController.upload_files_post)

  router.post('/create-folder', isAuthenticated, filemanagerController.create_folder_post)
  
  router.post('/delete-folder', isAuthenticated, filemanagerController.deleteFolder)
  //Routes for the SFTP controller 
  router.get('/sftp', sftpController.sftp_get)
  router.post('/sftp/connect', sftpController.sft_connect_post)
  router.post('/sftp/download', sftpController.sftp_download_post)
  router.post('/sftp/upload', sftpController.sftp_upload_post)
  router.get('/sftp/dir', sftpController.sft_list_directory_get)
  return router
}