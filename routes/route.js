const express = require('express');
const fs = require('fs');
const multer = require('multer');
var path = require('path');
module.exports = function (uploadsDir, isAuthenticated) {
  const router = express.Router();

  // Set up multer to save files with original names
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);  // Use the provided uploads directory
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);  // Preserve the original file name
    }
  });

  const upload = multer({ storage: storage });

  // Route to display the file list and upload form
  router.get('/', isAuthenticated, (req, res) => {
    fs.readdir(uploadsDir, (err, files) => {
      if (err) {
        return res.status(500).send('Unable to scan directory');
      }
      res.render('index', { files, user: req.user });
    });
  });

  router.post('/upload', isAuthenticated, upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }
    res.redirect('/');
  });

  router.get('/download/:filename', isAuthenticated, (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename);
    res.download(filePath, (err) => {
      if (err) {
        return res.status(500).send('File not found');
      }
    });
  });


  return router;
};