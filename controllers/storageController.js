const multer = require('multer');
const path = require('path');

const uploadsDir = path.join(__dirname, '../uploads')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(uploadsDir))  // Use the provided uploads directory
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)  // Preserve the original file name
    }
  })

const upload = multer({ storage: storage })

exports.uploadMiddleware = upload.array('files', 10)