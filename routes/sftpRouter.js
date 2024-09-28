const express = require('express');
const router = express.Router()
const sftpController = require('../controllers/sftpController')()
const storageController = require('../controllers/storageController')

router.get('/', sftpController.sftp_servers_get)
router.get('/connect/:serverId/*?', sftpController.sftp_id_list_files_get)
router.post('/upload',  storageController.uploadMiddleware, sftpController.sftp_upload_post)
router.get('/download/:serverId/*', sftpController.sftp_download_get)
router.post('/create-folder', sftpController.sftp_create_folder_post)
router.post('/save-server', sftpController.sftp_save_server_post)
router.post('/delete-file', sftpController.sftp_delete_file_post)
router.post('/delete-folder', sftpController.sftp_delete_folder_post)

module.exports = router