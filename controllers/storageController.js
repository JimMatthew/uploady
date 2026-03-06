const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(__dirname, "../uploads");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folderPath = req.body.folderPath || "";
    const targetFolder = path.join(uploadsDir, folderPath);

    if (!fs.existsSync(targetFolder)) {
      return cb(new Error("Folder does not exist"));
    }

    cb(null, targetFolder);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

exports.uploadMiddleware = upload.array("files", 10);
