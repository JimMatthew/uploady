const express = require('express');
const fs = require('fs');
const multer = require('multer');
var path = require('path');
const crypto = require('crypto');
module.exports = function (uploadsDir, isAuthenticated) {

  const router = express.Router()
  const publicLinks = new Map();
  const sharedLinks = new Map();

  // Set up multer to save files with original names
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir)  // Use the provided uploads directory
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)  // Preserve the original file name
    }
  })

  const upload = multer({ storage: storage })

  // Route to display the file list and upload form
  router.get('/', isAuthenticated, (req, res) => {
    fs.readdir(uploadsDir, (err, files) => {
      if (err) {
        return res.status(500).send('Unable to scan directory')
      }
      res.render('index', { files, user: req.user })
    })
  })

  router.get('/public/:token', (req, res) => {
    const token = req.params.token;
    const filePath = publicLinks.get(token);
  
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }
  
    res.download(filePath, (err) => {
      if (err) {
        return res.status(500).send('Error downloading file');
      }
    });
  });

  router.get('/share/:token', (req, res) => {
    const token = req.params.token;
    const filePath = sharedLinks.get(token);
  
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }
  
    res.download(filePath, (err) => {
      if (err) {
        return res.status(500).send('Error downloading file')
      }
    });
  });

  router.get('/links', isAuthenticated, (req, res) => {
    const links = Array.from(sharedLinks.entries()).map(([token, data]) => {
      return  { link: `${req.protocol}://${req.get('host')}/share/${token}`, fileName: data.fileName };
    })

    res.render('public-links', { links })
  })

  //Shares the file to a public link and keep the file namename
  router.post('/share', isAuthenticated, (req, res) => {
    const filename = req.body.fileName
    const filePath = path.join(uploadsDir, filename)
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found')
    }
    sharedLinks.set(filename, filePath)
    res.render('linkgen', {
      link: `${req.protocol}://${req.get('host')}/share/${filename}`,
      fileName: filename
    })
  })

  //Shares the file publicly but generates a random 20 char url
  router.post('/generate-link', isAuthenticated, (req, res) => {
    const fileName = req.body.fileName;
    const filePath = path.join(uploadsDir, fileName)
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found')
    }
    // Generate a unique token for the link
    const token = crypto.randomBytes(20).toString('hex');
    publicLinks.set(token, filePath);
    res.render('linkgen', {
      link: `${req.protocol}://${req.get('host')}/public/${token}`,
      fileName: fileName
    })
  })

  router.post('/delete/:filename', isAuthenticated, (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename)
    fs.unlink(filePath, (err) => {
      if (err) {
        return res.status(500).send('unable to delete file')
      }
      res.redirect('/')
    })
  })

  router.post('/upload', isAuthenticated, upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).send('No file uploaded')
    }
    res.redirect('/')
  })

  router.get('/download/:filename', isAuthenticated, (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename)
    res.download(filePath, (err) => {
      if (err) {
        return res.status(500).send('File not found')
      }
    })
  })
  return router
}