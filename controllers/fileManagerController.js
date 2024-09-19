const fs = require('fs');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const publicLinks = new Map()
const sharedLinks = new Map()
const uploadsDir = path.join(__dirname, '../uploads')

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

exports.uploadMiddleware = upload.array('files', 10)

exports.upload_file_post = (req, res) => {
  if (!req.files) {
    return res.status(400).send('No file uploaded')
  }
  res.redirect('/')
}

exports.listFiles = (req, res) => {
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan directory')
    }
    const fileList = files.map(file => {
      const stats = fs.statSync(path.join(uploadsDir, file))
      return {
        name: file,
        size: stats.size,
        date: stats.mtime,
      }
    })
    res.render('index', { files: fileList , user: req.user })
  })
}

exports.file_download_get = (req, res) => {
  const filePath =  sharedLinks.get(req.params.token)
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send('File not found')
    }
    res.download(filePath, (err) => {
      if (err) {
        return res.status(500).send('Error downloading file')
      }
    })
}

exports.file_links_get = (req, res) => {
  const links = Array.from(sharedLinks.entries()).map(([token, data]) => {
    return  { link: `${req.protocol}://${req.get('host')}/share/${token}`, fileName: token }
  })
  res.render('public-links', { links })
}

exports.listPublicLinks = (req, res) => {
  const links = Array.from(publicLinks.entries()).map(([token, filePath]) => ({
    fileName: path.basename(filePath),
    link: `${req.protocol}://${req.get('host')}/public/${token}`,
  }))
  res.render('publicLinks', { links })
}

exports.share_file_post = (req, res) => {
  const fileName = req.body.fileName
  const filePath = path.join(uploadsDir, fileName)
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found')
  }
  sharedLinks.set(fileName, filePath)
  res.render('linkgen', {
    link: `${req.protocol}://${req.get('host')}/share/${fileName}`,
    fileName: fileName
  })
}

exports.stop_sharing_post = (req, res) => {
  const fileName = req.body.fileName
  if (sharedLinks.has(fileName)) {
    sharedLinks.delete(fileName)
  }
  res.redirect('/links')
}

exports.download_shared_file_get = (req, res) => {
  const filePath = sharedLinks.get(req.params.token)
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send('File not found')
  }
  res.download(filePath, (err) => {
    if (err) {
      return res.status(500).send('Error downloading file')
    }
  })
}

exports.delete_file_post = (req, res) => {
  const fileName = req.params.filename
  const filePath = path.join(uploadsDir, fileName)
  fs.unlink(filePath, (err) => {
    if (err) {
      return res.status(500).send('unable to delete file')
    }
    if (sharedLinks.has(fileName)) {
      sharedLinks.delete(fileName)
    }
    res.redirect('/')
  })
}

exports.download_file_get = (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename)
  res.download(filePath, (err) => {
    if (err) {
      return res.status(500).send('File not found')
    }
  })
}
