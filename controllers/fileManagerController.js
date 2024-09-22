const fs = require('fs');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const SharedFile = require('../models/SharedFile')
const StoreType = require('../ConfigStorageType');
const ConfigStoreType = require('../ConfigStorageType');

module.exports = (configStoreType) => {

  const publicLinks = new Map()
  const sharedLinks = new Map()
  const uploadsDir = path.join(__dirname, '../uploads')

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir)  // Use the provided uploads directory
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)  // Preserve the original file name
    }
  })

  const upload = multer({ storage: storage })

  const uploadMiddleware = upload.array('files', 10)

  const upload_file_post = (req, res) => {
    if (!req.files) {
      return res.status(400).send('No file uploaded')
    }
    res.redirect('/')
  }

  const listFiles = (req, res) => {
    fs.readdir(uploadsDir, (err, files) => {
      if (err) {
        return res.status(500).send('Unable to scan directory')
      }
      const fileList = files.map(file => {
        const stats = fs.statSync(path.join(uploadsDir, file))
        return {
          name: file,
          size: stats.size,
          date: stats.mtime.toLocaleDateString(),
        }
      })
      res.render('index', { files: fileList , user: req.user })
    })
  }

  const getLinksFromLocal = (req) => {
    return Array.from(sharedLinks.entries()).map(([token, data]) => ({
      link: `${req.protocol}://${req.get('host')}/share/${token}`,
      fileName: token,
    }))
  }

  const file_links_get = async (req, res) => {
    let links = []

      switch (configStoreType) {
        case ConfigStoreType.LOCAL:
          links = getLinksFromLocal(req)
          break
        case ConfigStoreType.DATABASE:
          links = await SharedFile.find()
          break
        default:
          return res.status(500).send('invalid storage type')  
      }
      res.render('public-links', { links })
  }

  const listPublicLinks = async (req, res) => {
    switch (configStoreType) {
      case StoreType.DATABASE:
        const Sharedlinks = await SharedFile.find()
        break;
      case StoreType.LOCAL:  
    }
    const links = Array.from(publicLinks.entries()).map(([token, filePath]) => ({
      fileName: path.basename(filePath),
      link: `${req.protocol}://${req.get('host')}/public/${token}`,
    }))
    res.render('publicLinks', { links })
  }

  const share_file_post = async (req, res) => {
    const fileName = req.body.fileName
    const filePath = path.join(uploadsDir, fileName)
    const link = `${req.protocol}://${req.get('host')}/share/${fileName}`
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found')
    }
    storeLinkInfo(fileName, filePath, link)
    res.render('linkgen', {
      link: link,
      fileName: fileName
    })
  }

  const storeLinkInfo = async (fileName, filePath, link) => {
    switch (configStoreType) {
      case StoreType.DATABASE:
        const f = await SharedFile.findOne({ fileName })
        if (f) {
          return
        }
        const sharedFile = new SharedFile({
          fileName,
          filePath,
          link
        })
        await sharedFile.save();
        break;
      case StoreType.LOCAL:
        sharedLinks.set(fileName, filePath)
        break;
    }
  } 

  const stop_sharing_post = async (req, res) => {
    const fileName = req.body.fileName
    switch (configStoreType) {
      case ConfigStoreType.DATABASE:
        await SharedFile.deleteOne({ fileName })
        break
      case ConfigStoreType.LOCAL:
        if (sharedLinks.has(fileName)) {
          sharedLinks.delete(fileName)
        }
    }
    res.redirect('/links')
  }

  const getFilePathFromStorage = async (fileName) => {
    switch (configStoreType) {
      case ConfigStoreType.DATABASE:
        const sharedFile = await SharedFile.findOne({ fileName });
        return sharedFile ? sharedFile.filePath : null
  
      case ConfigStoreType.LOCAL:
        return sharedLinks.get(fileName)
  
      default:
        throw new Error('Invalid storage type')
    }
  }

  const checkFileExists = (filePath) => {
    return filePath && fs.existsSync(filePath)
  }

  const download_shared_file_get = async (req, res) => {
    try {
      const fileName = req.params.token
      const filePath = await getFilePathFromStorage(fileName)

      if (!checkFileExists(filePath)) {
        return res.status(404).send('Error downloading file')
      }

      res.download(filePath, (err) => {
        if (err) {
          return res.status(500).send('Error downloading file')
        }
      })
    }catch (error) {
      console.error(error);
      res.status(500).send('Server error');
    }
  }

  const delete_file_post = async (req, res) => {
    const fileName = req.params.filename
    const filePath = path.join(uploadsDir, fileName)
    fs.unlink(filePath, (err) => {
      if (err) {
        return res.status(500).send('unable to delete file')
      }
    })
    switch (configStoreType) {
      case ConfigStoreType.LOCAL:
        if (sharedLinks.has(fileName)) {
          sharedLinks.delete(fileName)
        }
        break

      case ConfigStoreType.DATABASE:
        await SharedFile.findOneAndDelete({ fileName }) 
    }
    res.redirect('/')
  }

  const download_file_get = (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename)
    res.download(filePath, (err) => {
      if (err) {
        return res.status(500).send('File not found')
      }
    })
  }

  return {
    uploadMiddleware, 
    upload_file_post,
    listFiles,
    file_links_get,
    listPublicLinks,
    share_file_post,
    stop_sharing_post,
    download_shared_file_get,
    delete_file_post,
    download_file_get,
  }
}
  

