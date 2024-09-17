const express = require('express');
const fs = require('fs');
const multer = require('multer');

module.exports = function (uploadsDir) {
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
  router.get('/', (req, res) => {
    fs.readdir(uploadsDir, (err, files) => {
      if (err) {
        return res.status(500).send('Unable to scan directory');
      }

      res.render('index', { files });
    });
  });

  // Route to handle file uploads
  router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }

    res.redirect('/');
  });

  // Download a specific file
  router.get('/download/:filename', (req, res) => {
    const filePath = `${uploadsDir}/${req.params.filename}`;

    res.download(filePath, (err) => {
      if (err) {
        return res.status(500).send('File not found');
      }
    });
  });

  return router;
};