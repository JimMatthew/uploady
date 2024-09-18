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
      return  { link: `${req.protocol}://${req.get('host')}/share/${token}`, fileName: token }
    })
    res.render('public-links', { links })
  })

  router.post('/share', isAuthenticated, (req, res) => {
    handleLinkGeneration(req, res, { isRandom: false })
  });
  
  router.post('/generate-link', isAuthenticated, (req, res) => {
    handleLinkGeneration(req, res, { isRandom: true })
  });

  const handleLinkGeneration = (req, res, options) => {
    const { isRandom } = options
    const fileName = req.body.fileName
    const filePath = path.join(uploadsDir, fileName)
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found')
    }
  
    // Generate the token based on the option
    const token = isRandom ? crypto.randomBytes(20).toString('hex') : fileName
    const linkType = isRandom ? 'public' : 'share'
  
    // Store the link in the appropriate collection
    const storage = isRandom ? publicLinks : sharedLinks
    storage.set(token, filePath)
  
    // Render the public/shared link
    res.render('linkgen', {
      link: `${req.protocol}://${req.get('host')}/${linkType}/${token}`,
      fileName: fileName
    })
  }

  router.post('/stop-sharing', isAuthenticated, (req, res) => {
    const fileName = req.body.fileName
    if (sharedLinks.has(fileName)) {
      sharedLinks.delete(fileName)
    }
    res.redirect('/links')
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