const multer = require('multer')
const path = require('path')

const tempdir = path.join(__dirname, '../temp')
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(tempdir)) 
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)  // Preserve the original file name
    }
  })

const upload = multer({ storage: storage })

exports.uploadMiddleware = upload.array('files', 10)