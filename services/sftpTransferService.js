const { PassThrough } = require("stream");
const path = require("path");
const { sendProgress } = require("./progressService");

// Helper to count all files recursively
async function countSftpFiles(sftp, dirPath) {
  const files = await sftp.list(dirPath);
  let count = 0;
  for (const file of files) {
    if (file.type === "-") {
      count++;
    } else if (file.type === "d") {
      count += await countSftpFiles(sftp, path.posix.join(dirPath, file.name));
    }
  }
  return count;
}

async function streamFileSftpPair(
  source,
  dest,
  sourcePath,
  destPath,
  filename,
  transferId
) {
  const passthrough = new PassThrough();
  const { size: totalSize } = await source.stat(sourcePath);
  let transferred = 0;
  let lastUpdate = Date.now();
  passthrough.on("data", (chunk) => {
    transferred += chunk.length;
    const now = Date.now();
    if (now - lastUpdate > 100) {
      lastUpdate = now;
      const percent = Math.min((transferred / totalSize) * 100, 100);
      sendProgress(transferId, { file: filename, percent: percent.toFixed(2) });
    }
  });
  await Promise.all([
    source.get(sourcePath, passthrough),
    dest.put(passthrough, destPath),
  ]);
  sendProgress(transferId, { file: filename, done: true });
}

async function streamFolderSftpToSftp(
  source, dest, sourcePath, destPath, transferId, folderName, counter
) {
  const name = folderName || path.basename(sourcePath);
  
  // Only count total on the first call, not on recursive calls
  if (!counter) {
    const total = await countSftpFiles(source, sourcePath);
    counter = { completed: 0, total, name };
  }

  const files = await source.list(sourcePath);
  await dest.mkdir(destPath, false);

  for (const file of files) {
    const srcFile = path.posix.join(sourcePath, file.name);
    const dstFile = path.posix.join(destPath, file.name);

    if (file.type === "-") {
      await streamFileSftpPair(source, dest, srcFile, dstFile, file.name, null);

      counter.completed++;
      if (transferId && counter.total > 0) {
        const percent = Math.min((counter.completed / counter.total) * 100, 100);
        sendProgress(transferId, { 
          file: counter.name, 
          percent: percent.toFixed(2) 
        });
      }
    } else if (file.type === "d") {
      // Pass the same counter down so all levels share it
      await streamFolderSftpToSftp(
        source, dest, srcFile, dstFile, transferId, counter.name, counter
      );
    }
  }
}

async function copySftpFolder(sftp, sourcePath, destPath, transferId) {
  const files = await sftp.list(sourcePath);
  await sftp.mkdir(destPath, false);

  const name = path.basename(sourcePath);
  const totalFiles = files.filter(f => f.type === "-").length;
  let completedFiles = 0;

  for (const file of files) {
    const srcFile = path.posix.join(sourcePath, file.name);
    const dstFile = path.posix.join(destPath, file.name);

    if (file.type === "-") {
      await sftp.rcopy(srcFile, dstFile);

      completedFiles++;
      if (transferId && totalFiles > 0) {
        const percent = Math.min((completedFiles / totalFiles) * 100, 100);
        sendProgress(transferId, { file: name, percent: percent.toFixed(2) });
      }
    } else if (file.type === "d") {
      await copySftpFolder(sftp, srcFile, dstFile, transferId);
    }
  }
}

module.exports = { streamFileSftpPair, streamFolderSftpToSftp, copySftpFolder };
