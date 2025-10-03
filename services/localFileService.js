const fs = require("fs");
const path = require("path");

const listLocalDir = (dirPath) => {
  const contents = fs.readdirSync(dirPath);
  const files = [];
  const folders = [];

  contents.forEach((item) => {
    const itemPath = path.join(dirPath, item);
    const stats = fs.lstatSync(itemPath);

    if (stats.isDirectory()) {
      folders.push({ name: item });
    } else if (stats.isFile()) {
      files.push({
        name: item,
        size: (stats.size / 1024).toFixed(2),
        date: stats.mtime.toLocaleDateString(),
      });
    }
  });

  return { files, folders };
};

module.exports = { listLocalDir };
