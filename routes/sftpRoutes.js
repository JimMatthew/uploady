
const sftpController = require('../controllers/sftpController')
const express = require('express');
const router = express.Router()

  router.get('/sftp', sftpController.sftp_get)
  
  router.post('/sftp/connect', sftpController.sft_connect_post)

  router.post('/sftp/download', sftpController.sftp_download_post)

  //router.post('/sftp/upload', sftpController.sftp_upload_post)
