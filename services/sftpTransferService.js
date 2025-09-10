const { PassThrough } = require("stream");
const path = require("path");
const { sendProgress } = require("./progressService");

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
  source,
  dest,
  sourcePath,
  destPath,
  transferId
) {
  const files = await source.list(sourcePath);
  await dest.mkdir(destPath, false);
  for (const file of files) {
    const srcFile = path.join(sourcePath, file.name);
    const dstFile = path.join(destPath, file.name);
    if (file.type === "-") {
      await streamFileSftpPair(
        source,
        dest,
        srcFile,
        dstFile,
        file.name,
        transferId
      );
    } else if (file.type === "d") {
      await streamFolderSftpToSftp(source, dest, srcFile, dstFile, transferId);
    }
  }
}

async function copySftpFolder(sftp, sourcePath, destPath) {
  const files = await sftp.list(sourcePath);
  await sftp.mkdir(destPath, false);
  for (const file of files) {
    const srcFolder = path.join(sourcePath, file.name);
    const dstFolder = path.join(destPath, file.name);
    if (file.type === "-") {
      await sftp.rcopy(srcFolder, dstFolder);
    } else if (file.type === "d") {
      await copySftpFolder(sftp, srcFolder, dstFolder);
    }
  }
}

module.exports = { streamFileSftpPair, streamFolderSftpToSftp, copySftpFolder };
