const fs = require("fs");
const path = require("path");
const sftpService = require("./sftpService")
const uploadsDir = path.join(__dirname, "../uploads");

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

const copy_local_folder = async (folderName, currentPath, newPath) => {
  const localPath = path.join(currentPath, folderName);
  const { files, folders } = listLocalDir(
    path.join(uploadsDir, localPath)
  );
  const newp = path.join(uploadsDir, newPath, folderName);
  await fs.promises.mkdir(newp);
  files.forEach(async (file) => {
    const cfpath = path.join(uploadsDir, localPath, file.name);
    const nfpath = path.join(newp, file.name);
    await fs.promises.copyFile(cfpath, nfpath);
  });
  folders.forEach(async (folder) => {
    await copy_local_folder(folder.name, localPath, path.join(newPath, folderName));
  });
};

const copy_local_file = async (filename, currentPath, newPath) => {
  const cfpath = path.join(uploadsDir, currentPath, filename);
  const nfpath = path.join(uploadsDir, newPath, filename);

  await fs.promises.mkdir(path.dirname(nfpath), { recursive: true });
  await fs.promises.copyFile(cfpath, nfpath);
};



module.exports = { listLocalDir, copy_local_folder, copy_local_file };
