const fs = require("fs");
const path = require("path");
const { PassThrough } = require("stream");
const uploadsDir = path.join(__dirname, "../uploads");
const { sendProgress } = require("./progressService");
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

const copy_local_file = async (filename, currentPath, newPath, transferId) => {
  const cfpath = path.join(uploadsDir, currentPath, filename);
  const nfpath = path.join(uploadsDir, newPath, filename);

  await fs.promises.mkdir(path.dirname(nfpath), { recursive: true });

  const stat = await fs.promises.stat(cfpath);
  const totalSize = stat.size;
  let transferred = 0;
  let lastUpdate = Date.now();

  const readStream = fs.createReadStream(cfpath);
  const writeStream = fs.createWriteStream(nfpath);
  const passthrough = new PassThrough();

  passthrough.on("data", (chunk) => {
    transferred += chunk.length;
    const now = Date.now();
    if (now - lastUpdate > 100) {
      lastUpdate = now;
      const percent = Math.min((transferred / totalSize) * 100, 100);
      if (transferId) {
        sendProgress(transferId, { file: filename, percent: percent.toFixed(2) });
      }
    }
  });

  await new Promise((resolve, reject) => {
    readStream
      .pipe(passthrough)
      .pipe(writeStream)
      .on("finish", resolve)
      .on("error", reject);
  });

  if (transferId) {
    sendProgress(transferId, { file: filename, done: true });
  }
};

function countLocalFiles(dirPath) {
  const { files, folders } = listLocalDir(dirPath);
  let count = files.length;
  for (const folder of folders) {
    count += countLocalFiles(path.join(dirPath, folder.name));
  }
  return count;
}

const copy_local_folder = async (folderName, currentPath, newPath, transferId, counter) => {
  const localPath = path.join(currentPath, folderName);
  const { files, folders } = listLocalDir(path.join(uploadsDir, localPath));
  const newp = path.join(uploadsDir, newPath, folderName);

  await fs.promises.mkdir(newp, { recursive: true });

  // Only count on first call
  if (!counter) {
    const total = countLocalFiles(path.join(uploadsDir, localPath));
    counter = { completed: 0, total, name: folderName };
  }

  for (const file of files) {
    await copy_local_file(file.name, localPath, path.join(newPath, folderName), null);

    counter.completed++;
    if (transferId && counter.total > 0) {
      const percent = Math.min((counter.completed / counter.total) * 100, 100);
      sendProgress(transferId, { 
        file: counter.name, 
        percent: percent.toFixed(2) 
      });
    }
  }

  for (const folder of folders) {
    await copy_local_folder(
      folder.name,
      localPath,
      path.join(newPath, folderName),
      transferId,
      counter  // pass same counter down
    );
  }
};

module.exports = { listLocalDir, copy_local_folder, copy_local_file };
