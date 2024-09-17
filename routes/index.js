var express = require('express');
const path = require('path');
var fs = require('fs');
var router = express.Router();

/* GET home page. */
router.get('/', (req, res) => {
  const directoryPath = path.join(__dirname, 'uploads');

  // Read files in the uploads directory
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan directory');
    }

    // Render the index template and pass the list of files
    res.render('index', { files });
  });
});
router.get('/download/:filename', (req, res) => {
  const fileName = req.params.filename;
  const directoryPath = path.join(__dirname, 'uploads');
  const filePath = path.join(directoryPath, fileName);

  res.download(filePath, (err) => {
    if (err) {
      return res.status(500).send('File not found');
    }
  });
});
module.exports = router;
