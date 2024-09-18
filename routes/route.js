const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

module.exports = function (uploadsDir, isAuthenticated) {

  const router = express.Router()
  const publicLinks = new Map()
  const sharedLinks = new Map()

  // Function to get file information (size, date)
  const getFileDetails = (filePath) => {
    const stats = fs.statSync(filePath)
    return {
      size: (stats.size / 1024).toFixed(2),  // Convert bytes to KB, rounded to 2 decimal places
      date: stats.mtime.toLocaleDateString(),  // Last modification date
    }
  }

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
    const filesDir = path.join(uploadsDir, 'uploads')
    const files = fs.readdirSync(uploadsDir).map(file => {
      const filePath = path.join(uploadsDir, file)
      const details = getFileDetails(filePath)
      return {
        name: file,
        size: details.size,
        date: details.date,
      }
    })
    res.render('index', {
      user: req.user,
      files: files,  // Send files with size and date to the template
    })
  })

  const downloadFile = (fileName, isRandom, req, res) => {
    const filePath = isRandom ? publicLinks.get(fileName) : sharedLinks.get(fileName)
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send('File not found')
    }
    res.download(filePath, (err) => {
      if (err) {
        return res.status(500).send('Error downloading file')
      }
    })
  }

  router.get('/public/:token', (req, res) => {
    downloadFile(req.params.token, true, req, res)
  })

  router.get('/share/:token', (req, res) => {
    downloadFile(req.params.token, false, req, res)
  })

  router.get('/links', isAuthenticated, (req, res) => {
    const links = Array.from(sharedLinks.entries()).map(([token, data]) => {
      return  { link: `${req.protocol}://${req.get('host')}/share/${token}`, fileName: data.fileName }
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
    const fileName = req.body.fileName
    const filePath = path.join(uploadsDir, fileName)
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found')
    }
    // Generate a unique token for the link
    const token = crypto.randomBytes(20).toString('hex')
    publicLinks.set(token, filePath)
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

  router.post('/upload', isAuthenticated, upload.array('files', 10), (req, res) => {
    if (!req.files) {
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