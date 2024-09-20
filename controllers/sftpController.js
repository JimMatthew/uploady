
const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

exports.sftp_get = (req, res) => {
    res.render('sftp', { files: null, message: null });
}

exports.sft_connect_post = async (req, res) => {
    const { host, username, password, directory } = req.body;
    const sftp = new SftpClient();
    const currentDirectory = directory || '/'; // Default to root if not provided
  
    try {
      await sftp.connect({ host, username, password });
      const fileList = await sftp.list(currentDirectory);
      res.render('sftplist', { 
        files: fileList, 
        message: `Connected to SFTP server at ${currentDirectory}`, 
        currentDirectory, 
        host, 
        username, 
        password 
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

/*
Download a file from sftp server. 
We transfer the file from SFTP server to a temp file on this server, 
and then download to client. We then remove the temp file
*/
exports.sftp_download_post = async (req, res) => {
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

exports.sftp_upload_post = async (req, res) => {
    const { host, username, password, localFilePath, remoteFilePath } = req.body;
    const sftp = new SftpClient();
    
    try {
      await sftp.connect({ host, username, password });
      await sftp.fastPut(localFilePath, remoteFilePath); // Upload local file to remote path
      res.render('sftp', { files: null, message: 'File uploaded successfully' });
      await sftp.end();
    } catch (err) {
      console.error(err);
      res.render('sftp', { files: null, message: 'File upload failed' });
    }
}